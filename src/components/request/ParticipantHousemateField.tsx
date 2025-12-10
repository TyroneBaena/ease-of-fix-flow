import React, { useState, useEffect } from 'react';
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { FormItem } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useHousemates } from '@/hooks/useHousemates';

interface PublicHousemate {
  id: string;
  firstName: string;
  lastName: string;
}

interface ParticipantHousemateFieldProps {
  value: string;
  onChange: (value: string) => void;
  isParticipantRelated: boolean;
  propertyId: string;
  publicHousemates?: PublicHousemate[]; // For public access via QR code
}

const formatParticipantName = (firstName: string, lastName: string): string => {
  return `${firstName} ${lastName.charAt(0)}.`;
};

export const ParticipantHousemateField = ({ 
  value, 
  onChange, 
  isParticipantRelated, 
  propertyId,
  publicHousemates 
}: ParticipantHousemateFieldProps) => {
  const [selectedOption, setSelectedOption] = useState<string>('');
  const [manualEntry, setManualEntry] = useState(false);
  
  // Use hook for authenticated users, or publicHousemates for public access
  const { housemates: authHousemates, fetchHousemates } = useHousemates();
  
  // Determine which housemates list to use
  const housemates = publicHousemates || authHousemates.map(h => ({
    id: h.id,
    firstName: h.firstName,
    lastName: h.lastName
  }));

  // Fetch housemates when propertyId changes (only for authenticated users)
  useEffect(() => {
    if (propertyId && !publicHousemates) {
      fetchHousemates(propertyId, false); // Don't include archived
    }
  }, [propertyId, publicHousemates, fetchHousemates]);

  // Reset selection when property changes
  useEffect(() => {
    setSelectedOption('');
    setManualEntry(false);
    onChange('');
  }, [propertyId]);

  // Initialize from existing value
  useEffect(() => {
    if (value && housemates.length > 0) {
      const matchingHousemate = housemates.find(h => 
        formatParticipantName(h.firstName, h.lastName) === value
      );
      if (matchingHousemate) {
        setSelectedOption(matchingHousemate.id);
        setManualEntry(false);
      } else if (value && value !== 'N/A') {
        setSelectedOption('other');
        setManualEntry(true);
      }
    }
  }, [value, housemates]);

  if (!isParticipantRelated) {
    return null;
  }

  const handleSelectChange = (selectedValue: string) => {
    setSelectedOption(selectedValue);
    
    if (selectedValue === 'other') {
      setManualEntry(true);
      onChange(''); // Clear the value for manual entry
    } else {
      setManualEntry(false);
      const selectedHousemate = housemates.find(h => h.id === selectedValue);
      if (selectedHousemate) {
        onChange(formatParticipantName(selectedHousemate.firstName, selectedHousemate.lastName));
      }
    }
  };

  const handleManualChange = (manualValue: string) => {
    onChange(manualValue);
  };

  const noPropertySelected = !propertyId;
  const noHousemates = housemates.length === 0;

  return (
    <Card>
      <CardContent className="pt-6">
        <FormItem>
          <div className="space-y-2">
            <Label className="text-base font-semibold">
              Participant's Name*
            </Label>
            <p className="text-sm text-muted-foreground">
              Select a housemate or enter the participant's name manually (e.g., "James L.")
            </p>
            
            {noPropertySelected ? (
              <Select disabled>
                <SelectTrigger>
                  <SelectValue placeholder="Select a property first" />
                </SelectTrigger>
              </Select>
            ) : noHousemates ? (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground italic">No housemates found for this property</p>
                <Input
                  value={value}
                  onChange={(e) => handleManualChange(e.target.value)}
                  placeholder="Enter participant name (e.g., James L.)"
                  className="w-full"
                  required={isParticipantRelated}
                />
              </div>
            ) : (
              <div className="space-y-2">
                <Select value={selectedOption} onValueChange={handleSelectChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a housemate or enter manually" />
                  </SelectTrigger>
                  <SelectContent>
                    {housemates.map((housemate) => (
                      <SelectItem key={housemate.id} value={housemate.id}>
                        {housemate.firstName} {housemate.lastName}
                      </SelectItem>
                    ))}
                    <SelectItem value="other">Other (enter manually)</SelectItem>
                  </SelectContent>
                </Select>
                
                {manualEntry && (
                  <Input
                    value={value}
                    onChange={(e) => handleManualChange(e.target.value)}
                    placeholder="Enter participant name (e.g., James L.)"
                    className="w-full"
                    required={isParticipantRelated}
                  />
                )}
              </div>
            )}
          </div>
        </FormItem>
      </CardContent>
    </Card>
  );
};
