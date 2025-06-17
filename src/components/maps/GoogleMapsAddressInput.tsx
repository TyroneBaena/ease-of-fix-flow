
import React, { useEffect, useRef, useState } from 'react';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { MapPin, Edit } from "lucide-react";
import { Loader } from "@googlemaps/js-api-loader";
import { toast } from "@/lib/toast";

interface GoogleMapsAddressInputProps {
  value: string;
  onChange: (address: string) => void;
  label?: string;
  placeholder?: string;
  required?: boolean;
  apiKey?: string;
}

export const GoogleMapsAddressInput: React.FC<GoogleMapsAddressInputProps> = ({
  value,
  onChange,
  label = "Address",
  placeholder = "Enter address or search with Google Maps",
  required = false,
  apiKey
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const [isManualMode, setIsManualMode] = useState(false);
  const [isGoogleMapsLoaded, setIsGoogleMapsLoaded] = useState(false);
  const [isLoadingMaps, setIsLoadingMaps] = useState(false);

  // Initialize Google Maps if API key is provided
  useEffect(() => {
    if (!apiKey || isGoogleMapsLoaded) return;

    const initializeGoogleMaps = async () => {
      try {
        setIsLoadingMaps(true);
        const loader = new Loader({
          apiKey,
          version: "weekly",
          libraries: ["places"]
        });

        await loader.load();
        setIsGoogleMapsLoaded(true);
        console.log('Google Maps loaded successfully');
      } catch (error) {
        console.error('Error loading Google Maps:', error);
        toast.error('Failed to load Google Maps. Using manual input mode.');
        setIsManualMode(true);
      } finally {
        setIsLoadingMaps(false);
      }
    };

    initializeGoogleMaps();
  }, [apiKey, isGoogleMapsLoaded]);

  // Initialize autocomplete when Google Maps is loaded
  useEffect(() => {
    if (!isGoogleMapsLoaded || !inputRef.current || isManualMode || !window.google) return;

    try {
      autocompleteRef.current = new window.google.maps.places.Autocomplete(
        inputRef.current,
        {
          types: ['address'],
          fields: ['formatted_address', 'geometry', 'address_components']
        }
      );

      const handlePlaceSelect = () => {
        const place = autocompleteRef.current?.getPlace();
        if (place?.formatted_address) {
          onChange(place.formatted_address);
          console.log('Selected place:', place);
        }
      };

      autocompleteRef.current.addListener('place_changed', handlePlaceSelect);
    } catch (error) {
      console.error('Error initializing autocomplete:', error);
      setIsManualMode(true);
    }

    return () => {
      if (autocompleteRef.current && window.google) {
        window.google.maps.event.clearInstanceListeners(autocompleteRef.current);
      }
    };
  }, [isGoogleMapsLoaded, isManualMode, onChange]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  };

  const toggleManualMode = () => {
    setIsManualMode(!isManualMode);
    if (isManualMode && autocompleteRef.current) {
      // Re-initialize autocomplete when switching back from manual mode
      setTimeout(() => {
        if (inputRef.current && isGoogleMapsLoaded && window.google) {
          autocompleteRef.current = new window.google.maps.places.Autocomplete(
            inputRef.current,
            {
              types: ['address'],
              fields: ['formatted_address', 'geometry', 'address_components']
            }
          );
        }
      }, 100);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label htmlFor="address">{label}{required && '*'}</Label>
        {isGoogleMapsLoaded && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={toggleManualMode}
            className="text-xs"
          >
            {isManualMode ? (
              <>
                <MapPin className="w-3 h-3 mr-1" />
                Use Maps
              </>
            ) : (
              <>
                <Edit className="w-3 h-3 mr-1" />
                Manual
              </>
            )}
          </Button>
        )}
      </div>
      
      <div className="relative">
        <Input
          ref={inputRef}
          id="address"
          name="address"
          value={value}
          onChange={handleInputChange}
          placeholder={isLoadingMaps ? "Loading Google Maps..." : placeholder}
          required={required}
          disabled={isLoadingMaps}
          className={isManualMode ? "pr-10" : ""}
        />
        
        {isManualMode && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <Edit className="w-4 h-4 text-gray-400" />
          </div>
        )}
        
        {!isManualMode && isGoogleMapsLoaded && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <MapPin className="w-4 h-4 text-blue-500" />
          </div>
        )}
      </div>
      
      {!apiKey && (
        <p className="text-sm text-gray-500">
          Add Google Maps API key to enable address autocomplete
        </p>
      )}
    </div>
  );
};
