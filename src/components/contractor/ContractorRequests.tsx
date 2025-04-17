
import React from 'react';
import { Card } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useContractorContext } from '@/contexts/ContractorContext';

export const ContractorRequests = () => {
  return (
    <Card>
      <div className="p-6">
        <h2 className="text-xl font-semibold mb-6">Recent Requests</h2>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Request ID</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Quote</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                  No requests found
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </div>
    </Card>
  );
};
