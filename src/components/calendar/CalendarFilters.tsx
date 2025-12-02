import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { usePropertyContext } from '@/contexts/property/PropertyContext';
import { Building2 } from 'lucide-react';

interface CalendarFiltersProps {
  selectedPropertyId: string | null;
  onPropertyChange: (propertyId: string | null) => void;
}

export const CalendarFilters: React.FC<CalendarFiltersProps> = ({
  selectedPropertyId,
  onPropertyChange,
}) => {
  const { properties } = usePropertyContext();
  
  // Sort properties alphabetically
  const sortedProperties = [...properties].sort((a, b) => 
    a.name.localeCompare(b.name)
  );

  return (
    <div className="flex items-center gap-4">
      <div className="flex items-center gap-2">
        <Building2 className="h-4 w-4 text-muted-foreground" />
        <Label className="text-sm font-medium">Property</Label>
      </div>
      <Select
        value={selectedPropertyId || 'all'}
        onValueChange={(value) => onPropertyChange(value === 'all' ? null : value)}
      >
        <SelectTrigger className="w-[200px] bg-background">
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
  );
};
