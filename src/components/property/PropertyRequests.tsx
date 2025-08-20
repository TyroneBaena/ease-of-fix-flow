
import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { MaintenanceRequest } from '@/types/property';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { ClipboardList, X, Search } from 'lucide-react';
import { formatTimestamp } from '@/components/request/detail/utils/dateUtils';
import { RequestEditButton } from '@/components/request/RequestEditButton';

interface PropertyRequestsProps {
  requests: MaintenanceRequest[];
  propertyId: string;
  onRequestUpdated?: () => void;
}

export const PropertyRequests: React.FC<PropertyRequestsProps> = ({ requests, propertyId, onRequestUpdated }) => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Filter requests based on selected filters
  const filteredRequests = useMemo(() => {
    return requests.filter(request => {
      const priorityMatch = priorityFilter === 'all' || request.priority === priorityFilter;
      const statusMatch = statusFilter === 'all' || request.status === statusFilter;
      
      // Search functionality - search in issue nature and site
      const searchMatch = searchTerm === '' || 
        (request.issueNature || request.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (request.site || request.category || '').toLowerCase().includes(searchTerm.toLowerCase());
      
      return priorityMatch && statusMatch && searchMatch;
    });
  }, [requests, priorityFilter, statusFilter, searchTerm]);

  // Clear all filters
  const clearFilters = () => {
    setSearchTerm('');
    setPriorityFilter('all');
    setStatusFilter('all');
  };

  // Check if any filters are active
  const hasActiveFilters = searchTerm !== '' || priorityFilter !== 'all' || statusFilter !== 'all';

  // Debug: log the requests to see what data we're working with
  console.log('PropertyRequests: requests data:', requests);
  console.log('PropertyRequests: requests count:', requests.length);
  console.log('PropertyRequests: requests details:', requests.map(r => ({ id: r.id, issueNature: r.issueNature, title: r.title })));

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle className="flex items-center">
          <ClipboardList className="h-5 w-5 mr-2" />
          Maintenance Requests
        </CardTitle>
        <CardDescription>
          All maintenance requests for this property
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Filters */}
        {requests.length > 0 && (
          <div className="mb-6">
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <div className="flex flex-col sm:flex-row gap-3">
                {/* Search input */}
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder="Search requests..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>
                
                <div className="w-full sm:w-40">
                  <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Priority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Priorities</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="w-full sm:w-40">
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="in-progress">In Progress</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {hasActiveFilters && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={clearFilters}
                  className="flex items-center gap-2"
                >
                  <X className="h-4 w-4" />
                  Clear Filters
                </Button>
              )}
            </div>

            {/* Active filters display */}
            {hasActiveFilters && (
              <div className="flex flex-wrap gap-2 mt-3">
                {searchTerm !== '' && (
                  <span className="inline-flex items-center px-2 py-1 rounded-md text-xs bg-secondary text-secondary-foreground">
                    Search: "{searchTerm}"
                    <button 
                      onClick={() => setSearchTerm('')}
                      className="ml-1 hover:bg-secondary-foreground/10 rounded p-0.5"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                )}
                {priorityFilter !== 'all' && (
                  <span className="inline-flex items-center px-2 py-1 rounded-md text-xs bg-secondary text-secondary-foreground">
                    Priority: {priorityFilter}
                    <button 
                      onClick={() => setPriorityFilter('all')}
                      className="ml-1 hover:bg-secondary-foreground/10 rounded p-0.5"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                )}
                {statusFilter !== 'all' && (
                  <span className="inline-flex items-center px-2 py-1 rounded-md text-xs bg-secondary text-secondary-foreground">
                    Status: {statusFilter}
                    <button 
                      onClick={() => setStatusFilter('all')}
                      className="ml-1 hover:bg-secondary-foreground/10 rounded p-0.5"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                )}
              </div>
            )}
          </div>
        )}

        {requests.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500">No maintenance requests for this property yet.</p>
            <Button
              className="mt-4"
              onClick={() => navigate(`/new-request?propertyId=${propertyId}`)}
            >
              Create Maintenance Request
            </Button>
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">No maintenance requests match your current filters.</p>
            <Button 
              variant="outline" 
              className="mt-4" 
              onClick={clearFilters}
            >
              Clear Filters
            </Button>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Issue Nature</TableHead>
                <TableHead>Site</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead className="min-w-[100px]">Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRequests.map((request) => {
                // Debug: log each request's date fields
                console.log(`Request ${request.id} - reportDate:`, request.reportDate, 'createdAt:', request.createdAt);
                
                return (
                  <TableRow key={request.id}>
                    <TableCell className="font-medium">{request.issueNature || request.title}</TableCell>
                    <TableCell>{request.site || request.category || 'N/A'}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs whitespace-nowrap ${
                        (request.priority === 'high') ? 'bg-red-100 text-red-800' : 
                        (request.priority === 'medium') ? 'bg-yellow-100 text-yellow-800' : 
                        'bg-green-100 text-green-800'
                      }`}>
                        {request.priority || 'Medium'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs whitespace-nowrap ${
                        request.status === 'completed' ? 'bg-green-100 text-green-800' : 
                        request.status === 'in_progress' || request.status === 'in-progress' ? 'bg-blue-100 text-blue-800' : 
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {request.status}
                      </span>
                    </TableCell>
                    <TableCell>{formatTimestamp(request.reportDate || request.createdAt)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/requests/${request.id}`)}
                        >
                          View
                        </Button>
                        <RequestEditButton
                          request={request as any}
                          onRequestUpdated={() => {
                            console.log('PropertyRequests - Request updated, triggering refresh');
                            onRequestUpdated?.();
                          }}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};
