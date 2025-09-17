import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CheckCircle, XCircle, Clock } from 'lucide-react';
import { format } from 'date-fns';

interface LoginAttempt {
  id: string;
  timestamp: string;
  email: string;
  status: 'success' | 'failed';
  msg: string;
  level: string;
}

interface RecentLoginAttemptsProps {
  attempts: LoginAttempt[];
  loading?: boolean;
}

export const RecentLoginAttempts: React.FC<RecentLoginAttemptsProps> = ({
  attempts,
  loading = false
}) => {
  const getStatusBadge = (status: string, level: string) => {
    if (status === 'failed' || level === 'error') {
      return (
        <Badge variant="destructive" className="flex items-center gap-1">
          <XCircle className="h-3 w-3" />
          Failed
        </Badge>
      );
    }
    
    return (
      <Badge variant="default" className="flex items-center gap-1 bg-green-100 text-green-800">
        <CheckCircle className="h-3 w-3" />
        Success
      </Badge>
    );
  };

  const formatTimestamp = (timestamp: string) => {
    try {
      return format(new Date(timestamp), 'MMM dd, HH:mm:ss');
    } catch (error) {
      return timestamp;
    }
  };

  const truncateEmail = (email: string, maxLength: number = 25) => {
    if (email.length <= maxLength) return email;
    return email.substring(0, maxLength) + '...';
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Recent Login Attempts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-8 bg-gray-200 rounded"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Recent Login Attempts
        </CardTitle>
      </CardHeader>
      <CardContent>
        {attempts.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No recent login attempts found
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden md:table-cell">Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {attempts.map((attempt) => (
                  <TableRow key={attempt.id}>
                    <TableCell className="font-mono text-xs">
                      {formatTimestamp(attempt.timestamp)}
                    </TableCell>
                    <TableCell className="max-w-xs">
                      <span title={attempt.email}>
                        {truncateEmail(attempt.email)}
                      </span>
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(attempt.status, attempt.level)}
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-xs text-muted-foreground max-w-xs">
                      <span title={attempt.msg}>
                        {attempt.msg.length > 50 
                          ? attempt.msg.substring(0, 50) + '...' 
                          : attempt.msg || 'No details'}
                      </span>
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