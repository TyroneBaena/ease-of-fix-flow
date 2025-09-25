import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface InvoiceRecord {
  id: string;
  invoice_number: string;
  invoice_file_url: string;
  invoice_file_name: string;
  final_cost: number;
  total_amount_with_gst: number;
  created_at: string;
  contractor_id: string;
  request_id: string;
  // Request details
  request_title: string;
  request_description: string;
  request_status: string;
  request_priority: string;
  request_category: string;
  request_location: string;
  request_created_at: string;
  // Property details
  property_name: string;
  property_address: string;
  // Contractor details
  contractor_name: string;
  contractor_company: string;
}

interface DateRange {
  from: string;
  to: string;
}

interface RequestBody {
  dateRange: DateRange;
  timeframeLabel: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    // Verify the user is authenticated and is an admin
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error('Invalid authentication token');
    }

    // Check if user is admin
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || profile?.role !== 'admin') {
      throw new Error('Admin access required');
    }

    // Parse request body
    const { dateRange, timeframeLabel }: RequestBody = await req.json();

    if (!dateRange?.from || !dateRange?.to) {
      throw new Error('Invalid date range provided');
    }

    console.log('Bulk invoice download request:', {
      userId: user.id,
      dateRange,
      timeframeLabel
    });

    // First fetch invoices
    const { data: invoices, error: invoicesError } = await supabase
      .from('invoices')
      .select(`
        id,
        invoice_number,
        invoice_file_url,
        invoice_file_name,
        final_cost,
        total_amount_with_gst,
        created_at,
        contractor_id,
        request_id
      `)
      .gte('created_at', dateRange.from)
      .lte('created_at', dateRange.to)
      .order('created_at', { ascending: false });

    if (invoicesError) {
      throw new Error(`Failed to fetch invoices: ${invoicesError.message}`);
    }

    if (!invoices || invoices.length === 0) {
      return new Response(
        JSON.stringify({ 
          error: 'No invoices found in the specified date range',
          invoiceCount: 0 
        }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Get all request IDs and contractor IDs
    const requestIds = [...new Set(invoices.map(inv => inv.request_id).filter(Boolean))];
    const contractorIds = [...new Set(invoices.map(inv => inv.contractor_id).filter(Boolean))];

    // Fetch maintenance requests
    const { data: requests } = await supabase
      .from('maintenance_requests')
      .select(`
        id,
        title,
        description,
        status,
        priority,
        category,
        location,
        created_at,
        property_id
      `)
      .in('id', requestIds);

    // Fetch properties for the requests
    const propertyIds = [...new Set(requests?.map(req => req.property_id).filter(Boolean) || [])];
    const { data: properties } = await supabase
      .from('properties')
      .select('id, name, address')
      .in('id', propertyIds);

    // Fetch contractors
    const { data: contractors } = await supabase
      .from('contractors')
      .select('id, contact_name, company_name')
      .in('id', contractorIds);

    console.log(`Found ${invoices.length} invoices to process`);

    // Create a temporary directory for file processing
    const tempDir = await Deno.makeTempDir();
    const zipFileName = `invoices_${timeframeLabel}_${new Date().toISOString().split('T')[0]}.zip`;
    const zipFilePath = `${tempDir}/${zipFileName}`;

    try {
      // Import JSZip for creating the zip file
      const JSZip = (await import("https://cdn.skypack.dev/jszip@3.10.1")).default;
      const zip = new JSZip();

      // Create a comprehensive CSV file with invoice and request details
      let csvContent = "Invoice Number,Invoice File,Amount (Ex GST),Total Amount (Inc GST),Invoice Date,Request Title,Request Description,Request Status,Request Priority,Request Category,Request Location,Request Created Date,Property Name,Property Address,Contractor Name,Company Name\n";
      
      let successCount = 0;
      let errorCount = 0;
      const errors: string[] = [];

      // Process each invoice
      for (const invoice of invoices) {
        try {
          console.log(`Processing invoice: ${invoice.invoice_number}`);
          
          // Find related data
          const request = requests?.find(r => r.id === invoice.request_id);
          const property = properties?.find(p => p.id === request?.property_id);
          const contractor = contractors?.find(c => c.id === invoice.contractor_id);
          
          // Download the invoice file from Supabase Storage
          // Extract the file path from the full URL
          let filePath = invoice.invoice_file_url;
          
          // Handle full storage URLs - extract everything after 'public/invoices/'
          if (filePath.includes('/storage/v1/object/public/invoices/')) {
            filePath = filePath.split('/storage/v1/object/public/invoices/')[1];
          } else if (filePath.includes('/storage/v1/object/invoices/')) {
            filePath = filePath.split('/storage/v1/object/invoices/')[1];
          } else if (filePath.startsWith('invoices/')) {
            filePath = filePath.replace('invoices/', '');
          }
          
          console.log(`Downloading file: ${filePath} for invoice: ${invoice.invoice_number}`);
          
          const { data: fileData, error: downloadError } = await supabase.storage
            .from('invoices')
            .download(filePath);

          if (downloadError || !fileData) {
            console.error(`Failed to download invoice ${invoice.invoice_number}:`, downloadError);
            errors.push(`${invoice.invoice_number}: ${downloadError?.message || 'File not found'}`);
            errorCount++;
            continue;
          }

          // Convert blob to array buffer
          const arrayBuffer = await fileData.arrayBuffer();
          
          // Create organized filename with request info
          const requestTitle = request?.title ? request.title.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 30) : 'Unknown_Request';
          const fileName = `${invoice.invoice_number}_${requestTitle}_${invoice.invoice_file_name}`;
          zip.file(fileName, arrayBuffer);

          // Add comprehensive data to CSV
          const escapeCsv = (str: string) => `"${(str || '').replace(/"/g, '""')}"`;
          
          csvContent += [
            escapeCsv(invoice.invoice_number || ''),
            escapeCsv(invoice.invoice_file_name || ''),
            escapeCsv(invoice.final_cost?.toString() || '0'),
            escapeCsv(invoice.total_amount_with_gst?.toString() || '0'),
            escapeCsv(invoice.created_at || ''),
            escapeCsv(request?.title || ''),
            escapeCsv(request?.description || ''),
            escapeCsv(request?.status || ''),
            escapeCsv(request?.priority || ''),
            escapeCsv(request?.category || ''),
            escapeCsv(request?.location || ''),
            escapeCsv(request?.created_at || ''),
            escapeCsv(property?.name || ''),
            escapeCsv(property?.address || ''),
            escapeCsv(contractor?.contact_name || ''),
            escapeCsv(contractor?.company_name || '')
          ].join(',') + '\n';
          
          successCount++;
          console.log(`Successfully processed invoice: ${invoice.invoice_number}`);

        } catch (error) {
          console.error(`Error processing invoice ${invoice.invoice_number}:`, error);
          const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
          errors.push(`${invoice.invoice_number}: ${errorMessage}`);
          errorCount++;
        }
      }

      // Add the comprehensive report to the zip
      zip.file("Invoice_Request_Report.csv", csvContent);

      // Add error log if there were any errors
      if (errors.length > 0) {
        const errorLog = "Errors encountered during processing:\n" + errors.join('\n');
        zip.file("processing_errors.txt", errorLog);
      }

      console.log(`Processing complete. Success: ${successCount}, Errors: ${errorCount}`);

      // Generate the zip file
      const zipContent = await zip.generateAsync({ type: "uint8array" });

      // Save zip file to temp directory
      await Deno.writeFile(zipFilePath, zipContent);

      // Upload the zip file to Supabase Storage
      const zipFileBuffer = await Deno.readFile(zipFilePath);
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('maintenance-files')
        .upload(`bulk-downloads/${zipFileName}`, zipFileBuffer, {
          contentType: 'application/zip',
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) {
        throw new Error(`Failed to upload zip file: ${uploadError.message}`);
      }

      // Get public URL for download
      const { data: urlData } = supabase.storage
        .from('maintenance-files')
        .getPublicUrl(`bulk-downloads/${zipFileName}`);

      console.log('Zip file created and uploaded successfully');

      // Clean up temp files
      await Deno.remove(tempDir, { recursive: true });

      // Return success response
      return new Response(
        JSON.stringify({
          success: true,
          downloadUrl: urlData.publicUrl,
          filename: zipFileName,
          invoiceCount: successCount,
          errorCount,
          errors: errors.length > 0 ? errors : undefined,
          message: `Successfully processed ${successCount} out of ${invoices.length} invoices`
        }),
        { 
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );

    } catch (zipError) {
      console.error('Error creating zip file:', zipError);
      // Clean up temp files on error
      try {
        await Deno.remove(tempDir, { recursive: true });
      } catch (cleanupError) {
        console.error('Error cleaning up temp files:', cleanupError);
      }
      throw new Error(`Failed to create zip file: ${(zipError as Error).message}`);
    }

  } catch (error) {
    console.error('Bulk download error:', error);
    
    return new Response(
      JSON.stringify({ 
        error: (error as Error).message || 'An unexpected error occurred',
        success: false 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});