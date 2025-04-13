
import React, { useState } from 'react';
import { usePropertyContext } from '@/contexts/PropertyContext';
import { useUserContext } from '@/contexts/UserContext';
import { MaintenanceRequest } from '@/types/property';
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { Button } from '@/components/ui/button';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Input } from '@/components/ui/input';
import { Download, Filter, Search } from 'lucide-react';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';

// Mock maintenance requests data
const mockMaintenanceRequests: MaintenanceRequest[] = [
  {
    id: '1',
    title: 'Broken AC in Meeting Room',
    description: 'The air conditioning unit is not working properly',
    category: 'HVAC',
    location: 'Meeting Room',
    priority: 'high',
    status: 'open',
    propertyId: '1',
    createdAt: '2023-04-05T10:30:00Z',
    updatedAt: '2023-04-05T10:30:00Z'
  },
  {
    id: '2',
    title: 'Leaking Faucet in Kitchen',
    description: 'The kitchen sink faucet has been leaking continuously',
    category: 'Plumbing',
    location: 'Kitchen',
    priority: 'medium',
    status: 'in-progress',
    propertyId: '2',
    createdAt: '2023-04-07T14:20:00Z',
    updatedAt: '2023-04-08T09:15:00Z'
  },
  {
    id: '3',
    title: 'Light Bulb Replacement in Office',
    description: 'Several light bulbs need to be replaced in the main office area',
    category: 'Electrical',
    location: 'Main Office',
    priority: 'low',
    status: 'open',
    propertyId: '1',
    createdAt: '2023-04-10T11:45:00Z',
    updatedAt: '2023-04-10T11:45:00Z'
  },
  {
    id: '4',
    title: 'Door Handle Broken',
    description: 'The conference room door handle is broken and needs repair',
    category: 'Structural',
    location: 'Conference Room',
    priority: 'medium',
    status: 'completed',
    propertyId: '3',
    createdAt: '2023-04-02T09:30:00Z',
    updatedAt: '2023-04-04T16:20:00Z'
  },
  {
    id: '5',
    title: 'Internet Connection Issues',
    description: 'Intermittent internet connectivity in the east wing',
    category: 'IT',
    location: 'East Wing',
    priority: 'high',
    status: 'in-progress',
    propertyId: '2',
    createdAt: '2023-04-09T13:15:00Z',
    updatedAt: '2023-04-10T10:30:00Z'
  }
];

const MaintenanceReport = () => {
  const { properties } = usePropertyContext();
  const { currentUser, isAdmin } = useUserContext();
  const [propertyFilter, setPropertyFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  
  // Filter properties based on user role
  const accessibleProperties = isAdmin() 
    ? properties 
    : properties.filter(prop => 
        currentUser?.assignedProperties?.includes(prop.id)
      );

  // Get maintenance requests (in a real app, this would come from an API)
  const maintenanceRequests = mockMaintenanceRequests;
  
  // Apply filters
  const filteredRequests = maintenanceRequests.filter(request => {
    // Filter by property
    if (propertyFilter !== 'all' && request.propertyId !== propertyFilter) {
      return false;
    }
    
    // Filter by status
    if (statusFilter !== 'all' && request.status !== statusFilter) {
      return false;
    }
    
    // Filter by search term
    if (searchTerm && !request.title.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }
    
    // Filter by user's properties if manager
    if (!isAdmin() && !currentUser?.assignedProperties?.includes(request.propertyId)) {
      return false;
    }
    
    return true;
  });
  
  const getPropertyName = (propertyId: string) => {
    return properties.find(p => p.id === propertyId)?.name || 'Unknown Property';
  };
  
  const getPriorityClass = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };
  
  const getStatusClass = (status: string) => {
    switch (status) {
      case 'open':
        return 'bg-blue-100 text-blue-800';
      case 'in-progress':
        return 'bg-purple-100 text-purple-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };
  
  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'MMM d, yyyy');
  };
  
  const downloadExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(
      filteredRequests.map(request => ({
        'Title': request.title,
        'Property': getPropertyName(request.propertyId),
        'Category': request.category,
        'Location': request.location,
        'Priority': request.priority,
        'Status': request.status,
        'Created At': formatDate(request.createdAt),
        'Last Updated': formatDate(request.updatedAt)
      }))
    );
    
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Maintenance Requests');
    
    // Generate file name with date
    const fileName = `maintenance-requests-${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
    
    // Write and download
    XLSX.writeFile(workbook, fileName);
  };
  
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">Maintenance Requests Report</h2>
        <Button onClick={downloadExcel} className="flex items-center">
          <Download className="mr-2 h-4 w-4" />
          Download Excel
        </Button>
      </div>
      
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
            <Input
              placeholder="Search requests..."
              className="pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        
        <div className="w-full md:w-48">
          <Select value={propertyFilter} onValueChange={setPropertyFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Property" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Properties</SelectItem>
              {accessibleProperties.map(property => (
                <SelectItem key={property.id} value={property.id}>
                  {property.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div className="w-full md:w-48">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="in-progress">In Progress</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Property</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredRequests.length > 0 ? (
              filteredRequests.map(request => (
                <TableRow key={request.id}>
                  <TableCell className="font-medium">{request.title}</TableCell>
                  <TableCell>{getPropertyName(request.propertyId)}</TableCell>
                  <TableCell>{request.category}</TableCell>
                  <TableCell>
                    <span className={`capitalize px-2 py-1 rounded-full text-xs ${getPriorityClass(request.priority)}`}>
                      {request.priority}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className={`capitalize px-2 py-1 rounded-full text-xs ${getStatusClass(request.status)}`}>
                      {request.status}
                    </span>
                  </TableCell>
                  <TableCell>{formatDate(request.createdAt)}</TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                  No maintenance requests matching your filters
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default MaintenanceReport;
