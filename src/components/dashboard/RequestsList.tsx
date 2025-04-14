
import React, { useState, useEffect } from 'react';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Filter } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import RequestCard from '@/components/RequestCard';
import { MaintenanceRequest } from '@/types/property';
import { requests as sampleRequests } from '@/data/sampleData';

interface RequestsListProps {
  allRequests?: MaintenanceRequest[];
}

const RequestsList = ({ allRequests = sampleRequests as unknown as MaintenanceRequest[] }: RequestsListProps) => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [filteredRequests, setFilteredRequests] = useState<MaintenanceRequest[]>([]);

  // Filter requests based on search term and active filter
  useEffect(() => {
    let result = allRequests;
    
    if (searchTerm) {
      result = result.filter(req => {
        const title = req.issueNature || req.title || '';
        const description = req.explanation || req.description || '';
        return title.toLowerCase().includes(searchTerm.toLowerCase()) || 
               description.toLowerCase().includes(searchTerm.toLowerCase());
      });
    }
    
    if (activeFilter !== 'all') {
      result = result.filter(request => request.status === activeFilter);
    }
    
    setFilteredRequests(result);
  }, [searchTerm, activeFilter, allRequests]);

  const handleFilterChange = (filter: string) => {
    setActiveFilter(filter);
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow mb-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4 sm:mb-0">Recent Requests</h2>
        <div className="flex items-center space-x-2">
          <div className="relative">
            <Search className="h-4 w-4 absolute top-3 left-3 text-gray-400" />
            <Input
              type="search"
              placeholder="Search requests..."
              className="pl-10 w-full"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button variant="outline" size="icon">
            <Filter className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      <div className="flex space-x-2 mb-6 overflow-x-auto">
        <Badge 
          onClick={() => handleFilterChange('all')} 
          className={`cursor-pointer ${activeFilter === 'all' ? 'bg-gray-900' : 'bg-gray-200 hover:bg-gray-300 text-gray-800'}`}
        >
          All
        </Badge>
        <Badge 
          onClick={() => handleFilterChange('open')} 
          className={`cursor-pointer ${activeFilter === 'open' ? 'bg-amber-500' : 'bg-amber-100 hover:bg-amber-200 text-amber-800'}`}
        >
          Open
        </Badge>
        <Badge 
          onClick={() => handleFilterChange('in-progress')} 
          className={`cursor-pointer ${activeFilter === 'in-progress' ? 'bg-blue-500' : 'bg-blue-100 hover:bg-blue-200 text-blue-800'}`}
        >
          In Progress
        </Badge>
        <Badge 
          onClick={() => handleFilterChange('completed')} 
          className={`cursor-pointer ${activeFilter === 'completed' ? 'bg-green-500' : 'bg-green-100 hover:bg-green-200 text-green-800'}`}
        >
          Completed
        </Badge>
      </div>
      
      <div className="space-y-4">
        {filteredRequests.length > 0 ? (
          filteredRequests.slice(0, 5).map(request => (
            <RequestCard key={request.id} request={request} onClick={() => navigate(`/requests/${request.id}`)} />
          ))
        ) : (
          <div className="text-center py-10">
            <p className="text-gray-500">No matching requests found</p>
          </div>
        )}
      </div>
      
      {filteredRequests.length > 5 && (
        <div className="mt-6 text-center">
          <Button variant="outline" onClick={() => navigate('/requests')}>
            View All Requests
          </Button>
        </div>
      )}
    </div>
  );
};

export default RequestsList;
