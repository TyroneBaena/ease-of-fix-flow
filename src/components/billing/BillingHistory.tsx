import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Download, ExternalLink, Receipt, RefreshCw } from 'lucide-react';
import { useUserContext } from '@/contexts/UnifiedAuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { formatFullDate } from '@/utils/dateFormatUtils';

interface Invoice {
  id: string;
  amount: number;
  status: 'paid' | 'failed' | 'pending';
  date: string;
  period_start: string;
  period_end: string;
  invoice_url?: string;
  property_count: number;
}

export const BillingHistory: React.FC = () => {
  const { currentUser } = useUserContext();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpeningPortal, setIsOpeningPortal] = useState(false);

  const fetchInvoices = async () => {
    if (!currentUser?.id) {
      console.log('No current user, skipping invoice fetch');
      return;
    }

    setLoading(true);
    
    try {
      // Get session for authentication
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error('Session error:', sessionError);
        toast.error('Authentication error. Please log in again.');
        setInvoices([]);
        setLoading(false);
        return;
      }
      
      if (!session) {
        console.log('No session found');
        toast.error('Please log in to view billing history');
        setInvoices([]);
        setLoading(false);
        return;
      }

      console.log('Fetching invoices with session:', { 
        hasAccessToken: !!session.access_token,
        userId: currentUser?.id 
      });

      // Fetch invoices from Stripe via edge function
      const { data, error } = await supabase.functions.invoke('get-invoice-history', {
        headers: { Authorization: `Bearer ${session.access_token}` }
      });

      if (error) {
        console.error('Error fetching invoices:', error);
        toast.error(`Failed to load invoices: ${error.message || 'Please try refreshing'}`);
        setInvoices([]);
        setLoading(false);
        return;
      }

      if (data?.success && data.invoices) {
        // Map Stripe invoice data to our Invoice interface
        const mappedInvoices: Invoice[] = data.invoices.map((inv: any) => ({
          id: inv.id,
          amount: inv.amount,
          status: inv.status,
          date: inv.date,
          period_start: inv.line_items?.[0]?.period_start || inv.date,
          period_end: inv.line_items?.[0]?.period_end || inv.date,
          invoice_url: inv.pdf_url || inv.hosted_url,
          property_count: inv.line_items?.[0]?.quantity || 0,
        }));

        setInvoices(mappedInvoices);
        toast.success(`Loaded ${mappedInvoices.length} invoice(s)`);
      } else {
        setInvoices([]);
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Error fetching billing history:', error);
      toast.error('Failed to load billing history');
      setInvoices([]);
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    fetchInvoices();
  };

  const handleOpenStripePortal = async () => {
    setIsOpeningPortal(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Please log in to access billing portal');
        return;
      }
      
      const { data, error } = await supabase.functions.invoke('customer-portal', {
        headers: { Authorization: `Bearer ${session.access_token}` }
      });
      
      if (error || !data?.url) {
        toast.error('Failed to open billing portal');
        return;
      }
      
      window.open(data.url, '_blank');
    } catch (error) {
      console.error('Error opening Stripe portal:', error);
      toast.error('An error occurred opening the billing portal');
    } finally {
      setIsOpeningPortal(false);
    }
  };

  const formatDate = (dateString: string) => {
    return formatFullDate(dateString);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD',
    }).format(amount);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive'> = {
      paid: 'default',
      pending: 'secondary',
      failed: 'destructive',
    };

    return (
      <Badge variant={variants[status] || 'secondary'}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Billing History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Billing History
          </CardTitle>
          {invoices.length > 0 && (
            <div className="flex gap-2">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleRefresh}
                disabled={loading}
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleOpenStripePortal}
                disabled={isOpeningPortal}
              >
                <ExternalLink className="h-4 w-4 mr-1" />
                {isOpeningPortal ? 'Opening...' : 'Stripe Portal'}
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {invoices.length === 0 ? (
          <div className="text-center py-8">
            <Receipt className="h-12 w-12 mx-auto mb-3 opacity-50 text-muted-foreground" />
            <p className="font-medium">No billing history yet</p>
            <p className="text-sm text-muted-foreground mt-1 mb-4">
              Your invoices will appear here after your first billing cycle completes
            </p>
            <div className="flex justify-center gap-3">
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleRefresh}
                disabled={loading}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Get Invoices
              </Button>
              <Button 
                variant="default" 
                size="sm"
                onClick={handleOpenStripePortal}
                disabled={isOpeningPortal}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                {isOpeningPortal ? 'Opening...' : 'View in Stripe Portal'}
              </Button>
            </div>
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Billing Period</TableHead>
                  <TableHead>Properties</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Invoice</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell className="font-medium">{formatDate(invoice.date)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(invoice.period_start)} - {formatDate(invoice.period_end)}
                    </TableCell>
                    <TableCell>{invoice.property_count}</TableCell>
                    <TableCell className="font-semibold">
                      {formatCurrency(invoice.amount)}
                    </TableCell>
                    <TableCell>{getStatusBadge(invoice.status)}</TableCell>
                    <TableCell className="text-right">
                      {invoice.invoice_url ? (
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => window.open(invoice.invoice_url, '_blank')}
                          >
                            <ExternalLink className="h-4 w-4 mr-1" />
                            View
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              // Download invoice logic
                              window.open(invoice.invoice_url, '_blank');
                            }}
                          >
                            <Download className="h-4 w-4 mr-1" />
                            Download
                          </Button>
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">Unavailable</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
