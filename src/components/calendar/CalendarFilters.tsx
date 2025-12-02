import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { usePropertyContext } from '@/contexts/property/PropertyContext';
import { Building2, Filter } from 'lucide-react';
import { MultiSelect } from '@/components/ui/multi-select';

export type EventTypeFilter = 'all' | 'events' | 'jobs';

interface CalendarFiltersProps {
  // Support both single and multi-select modes
  selectedPropertyId?: string | null;
  selectedPropertyIds?: string[];
  onPropertyChange?: (propertyId: string | null) => void;
  onPropertyIdsChange?: (propertyIds: string[]) => void;
  selectedEventType?: EventTypeFilter;
  onEventTypeChange?: (type: EventTypeFilter) => void;
  showPropertyFilter?: boolean;
  showEventTypeFilter?: boolean;
  multiSelect?: boolean;
}

export const CalendarFilters: React.FC<CalendarFiltersProps> = ({
  selectedPropertyId,
  selectedPropertyIds = [],
  onPropertyChange,
  onPropertyIdsChange,
  selectedEventType = 'all',
  onEventTypeChange,
  showPropertyFilter = true,
  showEventTypeFilter = true,
  multiSelect = false,
}) => {
  const { properties } = usePropertyContext();
  
  // Sort properties alphabetically
  const sortedProperties = [...properties].sort((a, b) => 
    a.name.localeCompare(b.name)
  );

  const propertyOptions = sortedProperties.map((property) => ({
    value: property.id,
    label: property.name,
  }));

  return (
    <div className="flex items-center gap-4 flex-wrap">
      {showPropertyFilter && (
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-muted-foreground" />
          <Label className="text-sm font-medium">Property</Label>
          
          {multiSelect && onPropertyIdsChange ? (
            <MultiSelect
              options={propertyOptions}
              selected={selectedPropertyIds}
              onChange={onPropertyIdsChange}
              placeholder="All Properties"
              className="w-[200px]"
            />
          ) : (
            <Select
              value={selectedPropertyId || 'all'}
              onValueChange={(value) => onPropertyChange?.(value === 'all' ? null : value)}
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
          )}
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
