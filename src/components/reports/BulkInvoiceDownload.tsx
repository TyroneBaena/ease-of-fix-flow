import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Download, Loader2 } from 'lucide-react';
import { format, subDays, subMonths, subYears } from 'date-fns';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/lib/toast';

interface DateRange {
  from: Date;
  to: Date;
}

const BulkInvoiceDownload = () => {
  const [timeframe, setTimeframe] = useState<string>('');
  const [customRange, setCustomRange] = useState<DateRange | null>(null);
  const [showCustomRange, setShowCustomRange] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState<string>('');

  const getDateRange = (): DateRange | null => {
    const now = new Date();
    
    switch (timeframe) {
      case '1day':
        return { from: subDays(now, 1), to: now };
      case '1month':
        return { from: subMonths(now, 1), to: now };
      case '1year':
        return { from: subYears(now, 1), to: now };
      case 'custom':
        return customRange;
      default:
        return null;
    }
  };

  const handleTimeframeChange = (value: string) => {
    setTimeframe(value);
    if (value === 'custom') {
      setShowCustomRange(true);
    } else {
      setShowCustomRange(false);
      setCustomRange(null);
    }
  };

  const validateDateRange = (range: DateRange | null): boolean => {
    if (!range || !range.from || !range.to) {
      toast.error('Please select a valid date range');
      return false;
    }

    if (range.from > range.to) {
      toast.error('Start date cannot be after end date');
      return false;
    }

    const daysDiff = Math.ceil((range.to.getTime() - range.from.getTime()) / (1000 * 60 * 60 * 24));
    if (daysDiff > 365) {
      toast.error('Date range cannot exceed 365 days to prevent timeout issues');
      return false;
    }

    return true;
  };

  const handleBulkDownload = async () => {
    if (!timeframe) {
      toast.error('Please select a timeframe');
      return;
    }

    const dateRange = getDateRange();
    if (!validateDateRange(dateRange)) {
      return;
    }

    setIsDownloading(true);
    setDownloadProgress('Preparing download...');

    try {
      // First, check how many invoices exist in the date range
      const { count, error: countError } = await supabase
        .from('invoices')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', dateRange!.from.toISOString())
        .lte('created_at', dateRange!.to.toISOString());

      if (countError) throw countError;

      if (!count || count === 0) {
        toast.error('No invoices found in the selected date range');
        return;
      }

      if (count > 100) {
        const proceed = window.confirm(
          `Found ${count} invoices. Large downloads may take several minutes. Continue?`
        );
        if (!proceed) return;
      }

      setDownloadProgress(`Found ${count} invoices. Starting download...`);

      // Call the edge function for bulk download
      const { data, error } = await supabase.functions.invoke('download-bulk-invoices', {
        body: {
          dateRange: {
            from: dateRange!.from.toISOString(),
            to: dateRange!.to.toISOString()
          },
          timeframeLabel: timeframe === 'custom' 
            ? `${format(dateRange!.from, 'yyyy-MM-dd')}_to_${format(dateRange!.to, 'yyyy-MM-dd')}`
            : timeframe
        }
      });

      if (error) throw error;

      if (data.downloadUrl) {
        setDownloadProgress('Download ready! Starting file download...');
        
        // Create a temporary link to download the file
        const link = document.createElement('a');
        link.href = data.downloadUrl;
        link.download = data.filename || `invoices_${timeframe}_${format(new Date(), 'yyyy-MM-dd')}.zip`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        toast.success(`Successfully downloaded ${data.invoiceCount} invoices`);
      } else {
        throw new Error('No download URL received');
      }

    } catch (error: any) {
      console.error('Bulk download error:', error);
      toast.error(error.message || 'Failed to download invoices. Please try again.');
    } finally {
      setIsDownloading(false);
      setDownloadProgress('');
    }
  };

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-medium">Bulk Invoice Download</h3>
          <p className="text-gray-600 text-sm">
            Download invoices in bulk for reporting and record-keeping purposes.
          </p>
        </div>
      </div>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Select Timeframe</label>
            <Select value={timeframe} onValueChange={handleTimeframeChange}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Choose a timeframe" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1day">Last 24 Hours</SelectItem>
                <SelectItem value="1month">Last Month</SelectItem>
                <SelectItem value="1year">Last Year</SelectItem>
                <SelectItem value="custom">Custom Date Range</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {showCustomRange && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">From Date</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !customRange?.from && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {customRange?.from ? format(customRange.from, "PPP") : <span>Pick a date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={customRange?.from}
                        onSelect={(date) => setCustomRange(prev => ({ ...prev!, from: date! }))}
                        initialFocus
                        className="p-3 pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">To Date</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !customRange?.to && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {customRange?.to ? format(customRange.to, "PPP") : <span>Pick a date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={customRange?.to}
                        onSelect={(date) => setCustomRange(prev => ({ ...prev!, to: date! }))}
                        initialFocus
                        className="p-3 pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </div>
          )}

          {isDownloading && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center space-x-2">
                <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                <span className="text-sm text-blue-700">{downloadProgress}</span>
              </div>
            </div>
          )}

          <Button 
            onClick={handleBulkDownload}
            disabled={!timeframe || isDownloading || (timeframe === 'custom' && !customRange?.from && !customRange?.to)}
            className="w-full"
          >
            {isDownloading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Preparing Download...
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                Download Invoices
              </>
            )}
          </Button>

          <div className="text-xs text-gray-500 space-y-1">
            <p>• Downloaded files will be in ZIP format containing all invoice PDFs</p>
            <p>• Large date ranges may take several minutes to process</p>
            <p>• Maximum date range is 365 days to prevent timeout issues</p>
            <p>• Only invoices you have access to will be included</p>
          </div>
        </div>
    </Card>
  );
};

export default BulkInvoiceDownload;