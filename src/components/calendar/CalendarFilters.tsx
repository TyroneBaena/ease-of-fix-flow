import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { usePropertyContext } from '@/contexts/property/PropertyContext';
import { Building2, Filter } from 'lucide-react';

export type EventTypeFilter = 'all' | 'events' | 'jobs';

interface CalendarFiltersProps {
  selectedPropertyId: string | null;
  onPropertyChange: (propertyId: string | null) => void;
  selectedEventType?: EventTypeFilter;
  onEventTypeChange?: (type: EventTypeFilter) => void;
  showPropertyFilter?: boolean;
  showEventTypeFilter?: boolean;
}

export const CalendarFilters: React.FC<CalendarFiltersProps> = ({
  selectedPropertyId,
  onPropertyChange,
  selectedEventType = 'all',
  onEventTypeChange,
  showPropertyFilter = true,
  showEventTypeFilter = true,
}) => {
  const { properties } = usePropertyContext();
  
  // Sort properties alphabetically
  const sortedProperties = [...properties].sort((a, b) => 
    a.name.localeCompare(b.name)
  );

  return (
    <div className="flex items-center gap-4 flex-wrap">
      {showPropertyFilter && (
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-muted-foreground" />
          <Label className="text-sm font-medium">Property</Label>
          <Select
            value={selectedPropertyId || 'all'}
            onValueChange={(value) => onPropertyChange(value === 'all' ? null : value)}
          >
            <SelectTrigger className="w-[180px] bg-background">
              <SelectValue placeholder="All Properties" />
            </SelectTrigger>
            <SelectContent className="bg-popover z-50">
              <SelectItem value="all">All Properties</SelectItem>
              {sortedProperties.map((property) => (
                <SelectItem key={property.id} value={property.id}>
                  {property.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      
      {showEventTypeFilter && onEventTypeChange && (
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Label className="text-sm font-medium">Type</Label>
          <Select
            value={selectedEventType}
            onValueChange={(value) => onEventTypeChange(value as EventTypeFilter)}
          >
            <SelectTrigger className="w-[140px] bg-background">
              <SelectValue placeholder="All" />
            </SelectTrigger>
            <SelectContent className="bg-popover z-50">
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="events">Events Only</SelectItem>
              <SelectItem value="jobs">Jobs Only</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
};
