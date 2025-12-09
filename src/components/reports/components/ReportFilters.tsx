
import React from 'react';
import { Property } from '@/types/property';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';

interface ReportFiltersProps {
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  propertyFilter: string;
  setPropertyFilter: (value: string) => void;
  statusFilter: string;
  setStatusFilter: (value: string) => void;
  priorityFilter: string;
  setPriorityFilter: (value: string) => void;
  participantFilter: string;
  setParticipantFilter: (value: string) => void;
  accessibleProperties: Property[];
}

const ReportFilters: React.FC<ReportFiltersProps> = ({
  searchTerm,
  setSearchTerm,
  propertyFilter,
  setPropertyFilter,
  statusFilter,
  setStatusFilter,
  priorityFilter,
  setPriorityFilter,
  participantFilter,
  setParticipantFilter,
  accessibleProperties
}) => {
  return (
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
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="in-progress">In Progress</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="w-full md:w-48">
        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger>
            <SelectValue placeholder="Priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priorities</SelectItem>
            <SelectItem value="low">Low</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="critical">Critical</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="w-full md:w-48">
        <Select value={participantFilter} onValueChange={setParticipantFilter}>
          <SelectTrigger>
            <SelectValue placeholder="Participant Related" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Participant: All</SelectItem>
            <SelectItem value="yes">Participant: Yes</SelectItem>
            <SelectItem value="no">Participant: No</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};

export default ReportFilters;
