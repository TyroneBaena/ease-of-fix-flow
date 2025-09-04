
import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload, FileText, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';

interface InvoiceUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  requestId: string;
  onInvoiceUploaded?: () => void;
}

export const InvoiceUploadDialog = ({
  open,
  onOpenChange,
  requestId,
  onInvoiceUploaded,
}: InvoiceUploadDialogProps) => {
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [finalCost, setFinalCost] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  
  // Calculate GST (10% in Australia)
  const gstRate = 0.10;
  const finalCostNum = parseFloat(finalCost) || 0;
  const gstAmount = finalCostNum * gstRate;
  const totalWithGst = finalCostNum + gstAmount;

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type (PDF, images)
      const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
      if (!allowedTypes.includes(file.type)) {
        toast.error('Please upload a PDF or image file');
        return;
      }
      
      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast.error('File size must be less than 10MB');
        return;
      }
      
      setSelectedFile(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!invoiceNumber.trim()) {
      toast.error('Please enter an invoice number');
      return;
    }
    
    if (!finalCost || finalCostNum <= 0) {
      toast.error('Please enter a valid final cost');
      return;
    }
    
    if (!selectedFile) {
      toast.error('Please select an invoice file to upload');
      return;
    }

    setIsUploading(true);
    
    try {
      // Get contractor ID
      const { data: contractorData, error: contractorError } = await supabase
        .from('contractors')
        .select('id')
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
        .single();

      if (contractorError || !contractorData?.id) {
        throw new Error('Contractor not found');
      }

      // Upload file to storage
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${requestId}_${invoiceNumber}_${Date.now()}.${fileExt}`;
      const filePath = `${contractorData.id}/${fileName}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('invoices')
        .upload(filePath, selectedFile);

      if (uploadError) {
        throw uploadError;
      }

      // Get the public URL for the uploaded file
      const { data: urlData } = supabase.storage
        .from('invoices')
        .getPublicUrl(filePath);

      // Create invoice record
      const { data: invoiceData, error: invoiceError } = await supabase
        .from('invoices')
        .insert({
          request_id: requestId,
          contractor_id: contractorData.id,
          invoice_number: invoiceNumber,
          final_cost: finalCostNum,
          gst_amount: gstAmount,
          total_amount_with_gst: totalWithGst,
          invoice_file_url: urlData.publicUrl,
          invoice_file_name: selectedFile.name
        })
        .select()
        .single();

      if (invoiceError) {
        throw invoiceError;
      }

      // Update maintenance request to link with invoice and mark as completed
      const { error: updateError } = await supabase
        .from('maintenance_requests')
        .update({
          invoice_id: invoiceData.id,
          status: 'completed',
          completion_percentage: 100
        })
        .eq('id', requestId);

      if (updateError) {
        throw updateError;
      }

      // Send notification to admins and managers
      await sendInvoiceNotifications(requestId, invoiceNumber, totalWithGst);

      toast.success('Invoice uploaded successfully! Job marked as complete.');
      onOpenChange(false);
      if (onInvoiceUploaded) onInvoiceUploaded();
      
      // Reset form
      setInvoiceNumber('');
      setFinalCost('');
      setSelectedFile(null);
      
    } catch (error) {
      console.error('Error uploading invoice:', error);
      toast.error('Failed to upload invoice. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const sendInvoiceNotifications = async (requestId: string, invoiceNumber: string, totalAmount: number) => {
    try {
      // Get all admin and manager users from the same organization as the request
      const { data: requestData } = await supabase
        .from('maintenance_requests')
        .select('organization_id')
        .eq('id', requestId)
        .single();

      if (!requestData?.organization_id) {
        console.error('Could not find organization for request');
        return;
      }

      const { data: adminUsers, error: adminError } = await supabase
        .from('profiles')
        .select('id, email, name, organization_id')
        .in('role', ['admin', 'manager'])
        .eq('organization_id', requestData.organization_id);

      if (adminError) {
        console.error('Error fetching admin users:', adminError);
        return;
      }

      // Create in-app notifications for each admin/manager
      const notifications = adminUsers.map(user => ({
        title: 'New Invoice Uploaded',
        message: `Invoice #${invoiceNumber} has been uploaded for job #${requestId.substring(0, 8)} with total amount $${totalAmount.toFixed(2)} (inc. GST)`,
        type: 'info',
        user_id: user.id.toString(),
      }));

      const { error: notifyError } = await supabase
        .from('notifications')
        .insert(notifications);

      if (notifyError) {
        console.error('Error creating notifications:', notifyError);
      }

      // Send email notifications to admins/managers
      for (const user of adminUsers) {
        if (user.email) {
          try {
            const { error } = await supabase.functions.invoke('send-invoice-notification', {
              body: {
                invoice_id: requestId, // This should be the actual invoice ID once created
                notification_type: 'uploaded',
                recipient_email: user.email,
                recipient_name: user.name || 'Admin'
              }
            });
            
            if (error) {
              console.error('Error sending invoice email to:', user.email, error);
            }
          } catch (emailError) {
            console.error('Failed to send invoice email:', emailError);
          }
        }
      }

    } catch (error) {
      console.error('Error in sendInvoiceNotifications:', error);
    }
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Upload Invoice - Job Completion
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="h-4 w-4 text-blue-600" />
              <p className="text-sm font-medium text-blue-800">Job Completion</p>
            </div>
            <p className="text-sm text-blue-700">
              Uploading an invoice will mark this job as 100% complete and notify administrators.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="invoiceNumber">Invoice Number *</Label>
            <Input
              id="invoiceNumber"
              type="text"
              placeholder="e.g., INV-2024-001"
              value={invoiceNumber}
              onChange={(e) => setInvoiceNumber(e.target.value)}
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="finalCost">Final Cost (excluding GST) *</Label>
            <Input
              id="finalCost"
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={finalCost}
              onChange={(e) => setFinalCost(e.target.value)}
              required
            />
          </div>

          {finalCostNum > 0 && (
            <div className="bg-gray-50 p-3 rounded-lg space-y-1">
              <div className="flex justify-between text-sm">
                <span>Final Cost:</span>
                <span>${finalCostNum.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>GST (10%):</span>
                <span>${gstAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm font-semibold border-t pt-1">
                <span>Total (inc. GST):</span>
                <span>${totalWithGst.toFixed(2)}</span>
              </div>
            </div>
          )}
          
          <div className="space-y-2">
            <Label htmlFor="invoiceFile">Invoice File (PDF or Image) *</Label>
            <div className="flex items-center gap-2">
              <Input
                id="invoiceFile"
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={handleFileSelect}
                className="flex-1"
                required
              />
              <Upload className="h-4 w-4 text-gray-500" />
            </div>
            {selectedFile && (
              <p className="text-sm text-green-600">
                Selected: {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              Accepted formats: PDF, JPG, PNG. Max size: 10MB
            </p>
          </div>
          
          <DialogFooter className="pt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              disabled={isUploading}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isUploading}
              className="bg-green-600 hover:bg-green-700"
            >
              {isUploading ? 'Uploading...' : 'Upload Invoice & Complete Job'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
