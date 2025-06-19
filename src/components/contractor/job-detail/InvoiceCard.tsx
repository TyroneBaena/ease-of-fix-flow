
import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Download, Calendar, DollarSign } from 'lucide-react';

interface InvoiceData {
  id: string;
  invoice_number: string;
  final_cost: number;
  gst_amount: number;
  total_amount_with_gst: number;
  invoice_file_url: string;
  invoice_file_name: string;
  uploaded_at: string;
}

interface InvoiceCardProps {
  invoice: InvoiceData;
}

export const InvoiceCard = ({ invoice }: InvoiceCardProps) => {
  const handleDownload = () => {
    window.open(invoice.invoice_file_url, '_blank');
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateString;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-green-600" />
          Invoice Details
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <div>
              <p className="text-sm font-medium text-gray-500">Invoice Number</p>
              <p className="text-sm font-semibold">{invoice.invoice_number}</p>
            </div>
            
            <div>
              <p className="text-sm font-medium text-gray-500">Upload Date</p>
              <div className="flex items-center gap-1">
                <Calendar className="h-3 w-3 text-gray-400" />
                <p className="text-sm">{formatDate(invoice.uploaded_at)}</p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <p className="text-sm font-medium text-gray-500">File Name</p>
              <p className="text-sm">{invoice.invoice_file_name}</p>
            </div>
            
            <Button
              onClick={handleDownload}
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Download Invoice
            </Button>
          </div>
        </div>

        <div className="bg-green-50 p-4 rounded-lg border border-green-200">
          <div className="flex items-center gap-2 mb-3">
            <DollarSign className="h-4 w-4 text-green-600" />
            <p className="text-sm font-medium text-green-800">Final Costs</p>
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Final Cost:</span>
              <span>${invoice.final_cost.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>GST (10%):</span>
              <span>${invoice.gst_amount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm font-semibold border-t border-green-200 pt-2">
              <span>Total (inc. GST):</span>
              <span className="text-green-700">${invoice.total_amount_with_gst.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
