
import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, DollarSign, FileText, RefreshCw, Edit } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface Quote {
  id: string;
  amount: number;
  description?: string;
  status: 'requested' | 'pending' | 'approved' | 'rejected';
  submittedAt: string;
  createdAt: string;
}

interface QuoteLog {
  id: string;
  quoteId: string;
  action: 'created' | 'updated' | 'resubmitted';
  oldAmount?: number;
  newAmount: number;
  oldDescription?: string;
  newDescription?: string;
  createdAt: string;
}

interface ContractorQuoteHistoryProps {
  quotes: Quote[];
  quoteLogs?: QuoteLog[];
  loading?: boolean;
}

export const ContractorQuoteHistory = ({ quotes, quoteLogs = [], loading }: ContractorQuoteHistoryProps) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'requested':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'created':
        return <DollarSign className="h-4 w-4 text-green-600" />;
      case 'updated':
        return <Edit className="h-4 w-4 text-blue-600" />;
      case 'resubmitted':
        return <RefreshCw className="h-4 w-4 text-orange-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getActionText = (action: string, log: QuoteLog) => {
    switch (action) {
      case 'created':
        return `Quote created for $${log.newAmount.toFixed(2)}`;
      case 'updated':
        return `Quote updated from $${log.oldAmount?.toFixed(2) || '0.00'} to $${log.newAmount.toFixed(2)}`;
      case 'resubmitted':
        return `Quote resubmitted for $${log.newAmount.toFixed(2)}`;
      default:
        return 'Quote action';
    }
  };

  const getActionTextForQuote = (quote: Quote) => {
    if (quote.status === 'requested') {
      return 'Quote was requested';
    }
    return 'Quote submitted';
  };

  // Create a combined timeline of quotes and logs
  const createTimeline = () => {
    const timeline: Array<{
      type: 'quote' | 'log';
      data: Quote | QuoteLog;
      timestamp: string;
    }> = [];

    // Add quotes to timeline - use submittedAt for proper timeline ordering
    quotes.forEach(quote => {
      timeline.push({
        type: 'quote',
        data: quote,
        timestamp: quote.submittedAt // Use submittedAt consistently
      });
    });

    // Add quote logs to timeline
    quoteLogs.forEach(log => {
      timeline.push({
        type: 'log',
        data: log,
        timestamp: log.createdAt
      });
    });

    // Sort by timestamp descending (newest first)
    const sortedTimeline = timeline.sort((a, b) => {
      const dateA = new Date(a.timestamp);
      const dateB = new Date(b.timestamp);
      return dateB.getTime() - dateA.getTime();
    });

    // Debug logging to help identify timestamp issues
    console.log('Timeline items with timestamps:', sortedTimeline.map(item => ({
      type: item.type,
      id: item.data.id,
      timestamp: item.timestamp,
      parsedDate: new Date(item.timestamp),
      isValidDate: !isNaN(new Date(item.timestamp).getTime())
    })));

    return sortedTimeline;
  };

  // Helper function to safely format timestamp
  const formatTimestamp = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      if (isNaN(date.getTime())) {
        console.warn('Invalid timestamp:', timestamp);
        return 'Invalid date';
      }
      return formatDistanceToNow(date, { addSuffix: true });
    } catch (error) {
      console.error('Error formatting timestamp:', timestamp, error);
      return 'Invalid date';
    }
  };

  if (loading) {
    return (
      <Card className="p-6">
        <h3 className="font-semibold mb-4">Your Quote History</h3>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      </Card>
    );
  }

  if (quotes.length === 0) {
    return (
      <Card className="p-6">
        <h3 className="font-semibold mb-4">Your Quote History</h3>
        <div className="text-center py-6 text-gray-500">
          <FileText className="h-8 w-8 mx-auto mb-2 text-gray-400" />
          <p className="text-sm">No quotes submitted yet</p>
          <p className="text-xs mt-1">Your quote submissions will appear here</p>
        </div>
      </Card>
    );
  }

  const timeline = createTimeline();

  return (
    <Card className="p-6">
      <h3 className="font-semibold mb-4">Your Quote History</h3>
      <div className="space-y-4">
        {timeline.map((item, index) => {
          const formattedTime = formatTimestamp(item.timestamp);
          
          return (
            <div key={`${item.type}-${item.data.id}-${index}`} className="border-l-4 border-blue-200 pl-4 py-3 bg-gray-50 rounded-r">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  {item.type === 'quote' ? (
                    <Clock className="h-4 w-4 text-gray-500" />
                  ) : (
                    getActionIcon((item.data as QuoteLog).action)
                  )}
                  <span className="text-sm font-medium">
                    {item.type === 'quote' 
                      ? getActionTextForQuote(item.data as Quote)
                      : getActionText((item.data as QuoteLog).action, item.data as QuoteLog)
                    }
                  </span>
                  {item.type === 'quote' && (
                    <Badge className={getStatusColor((item.data as Quote).status)}>
                      {(item.data as Quote).status}
                    </Badge>
                  )}
                </div>
                <span className="text-xs text-gray-500" title={`Raw timestamp: ${item.timestamp}`}>
                  {formattedTime}
                </span>
              </div>
              
              {item.type === 'quote' && (item.data as Quote).status !== 'requested' && (
                <div className="ml-6 space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <DollarSign className="h-4 w-4 text-green-600" />
                    <span className="font-medium">Amount: ${(item.data as Quote).amount.toFixed(2)}</span>
                  </div>
                  
                  {(item.data as Quote).description && (
                    <div className="text-sm text-gray-600">
                      <span className="font-medium">Description: </span>
                      {(item.data as Quote).description}
                    </div>
                  )}
                </div>
              )}

              {item.type === 'log' && (item.data as QuoteLog).newDescription && (
                <div className="ml-6 text-sm text-gray-600">
                  <span className="font-medium">Details: </span>
                  {(item.data as QuoteLog).newDescription}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
};
