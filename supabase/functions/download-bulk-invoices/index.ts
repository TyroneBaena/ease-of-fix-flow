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

    // Fetch invoices in the date range
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

    console.log(`Found ${invoices.length} invoices to process`);

    // Create a temporary directory for file processing
    const tempDir = await Deno.makeTempDir();
    const zipFileName = `invoices_${timeframeLabel}_${new Date().toISOString().split('T')[0]}.zip`;
    const zipFilePath = `${tempDir}/${zipFileName}`;

    try {
      // Import JSZip for creating the zip file
      const JSZip = (await import("https://cdn.skypack.dev/jszip@3.10.1")).default;
      const zip = new JSZip();

      // Create a summary CSV file
      let csvContent = "Invoice Number,File Name,Amount (Ex GST),Total Amount (Inc GST),Date Created,Contractor ID,Request ID\n";
      
      let successCount = 0;
      let errorCount = 0;
      const errors: string[] = [];

      // Process each invoice
      for (const invoice of invoices as InvoiceRecord[]) {
        try {
          console.log(`Processing invoice: ${invoice.invoice_number}`);
          
          // Download the invoice file from Supabase Storage
          const { data: fileData, error: downloadError } = await supabase.storage
            .from('invoices')
            .download(invoice.invoice_file_url.split('/').pop() || '');

          if (downloadError || !fileData) {
            console.error(`Failed to download invoice ${invoice.invoice_number}:`, downloadError);
            errors.push(`${invoice.invoice_number}: ${downloadError?.message || 'File not found'}`);
            errorCount++;
            continue;
          }

          // Convert blob to array buffer
          const arrayBuffer = await fileData.arrayBuffer();
          
          // Add file to zip with organized naming
          const fileName = `${invoice.invoice_number}_${invoice.invoice_file_name}`;
          zip.file(fileName, arrayBuffer);

          // Add to CSV summary
          csvContent += `"${invoice.invoice_number}","${invoice.invoice_file_name}","${invoice.final_cost}","${invoice.total_amount_with_gst}","${invoice.created_at}","${invoice.contractor_id}","${invoice.request_id}"\n`;
          
          successCount++;
          console.log(`Successfully processed invoice: ${invoice.invoice_number}`);

        } catch (error) {
          console.error(`Error processing invoice ${invoice.invoice_number}:`, error);
          errors.push(`${invoice.invoice_number}: ${error.message}`);
          errorCount++;
        }
      }

      // Add the CSV summary to the zip
      zip.file("invoice_summary.csv", csvContent);

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
          cacheControl: '3600'
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
      throw new Error(`Failed to create zip file: ${zipError.message}`);
    }

  } catch (error) {
    console.error('Bulk download error:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message || 'An unexpected error occurred',
        success: false 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});