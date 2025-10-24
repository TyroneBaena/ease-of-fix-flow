
import React, { useEffect, useRef, useState } from 'react';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { MapPin, Edit, AlertCircle } from "lucide-react";
import { Loader } from "@googlemaps/js-api-loader";
import { toast } from "@/lib/toast";
import { Alert, AlertDescription } from "@/components/ui/alert";

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
  const [loadError, setLoadError] = useState<string | null>(null);

  // Initialize Google Maps if API key is provided
  useEffect(() => {
    if (!apiKey || isGoogleMapsLoaded) {
      if (!apiKey) {
        console.log('🗺️ No Google Maps API key provided - manual mode only');
        setLoadError('No API key configured');
      }
      return;
    }

    const initializeGoogleMaps = async () => {
      try {
        setIsLoadingMaps(true);
        setLoadError(null);
        
        console.log('🗺️ Initializing Google Maps with API key:', apiKey.substring(0, 10) + '...');
        
        const loader = new Loader({
          apiKey,
          version: "weekly",
          libraries: ["places"]
        });

        console.log('🗺️ Loading Google Maps libraries...');
        await loader.load();
        
        console.log('✅ Google Maps loaded successfully');
        console.log('✅ Places library available:', !!window.google?.maps?.places);
        
        setIsGoogleMapsLoaded(true);
      } catch (error: any) {
        console.error('❌ Error loading Google Maps:', error);
        console.error('Error details:', {
          message: error?.message,
          stack: error?.stack,
          name: error?.name
        });
        
        let errorMessage = 'Failed to load Google Maps. ';
        
        if (error?.message?.includes('ApiNotActivatedMapError')) {
          errorMessage += 'Places API is not enabled in Google Cloud Console.';
        } else if (error?.message?.includes('ApiTargetBlockedMapError')) {
          errorMessage += 'API key restrictions are blocking this domain.';
        } else if (error?.message?.includes('RefererNotAllowedMapError')) {
          errorMessage += 'This domain is not authorized for this API key.';
        } else if (error?.message?.includes('InvalidKeyMapError')) {
          errorMessage += 'Invalid API key.';
        } else {
          errorMessage += 'Using manual input mode.';
        }
        
        setLoadError(errorMessage);
        toast.error(errorMessage);
        setIsManualMode(true);
      } finally {
        setIsLoadingMaps(false);
      }
    };

    initializeGoogleMaps();
  }, [apiKey, isGoogleMapsLoaded]);

  // Initialize autocomplete when Google Maps is loaded
  useEffect(() => {
    if (!isGoogleMapsLoaded || !inputRef.current || isManualMode) {
      console.log('⏳ Skipping autocomplete init:', { 
        isGoogleMapsLoaded, 
        hasInputRef: !!inputRef.current, 
        isManualMode 
      });
      return;
    }

    if (!window.google?.maps?.places) {
      console.error('❌ Google Maps Places library not available');
      setLoadError('Places library not loaded');
      setIsManualMode(true);
      return;
    }

    try {
      console.log('🔧 Initializing Places Autocomplete...');
      
      autocompleteRef.current = new window.google.maps.places.Autocomplete(
        inputRef.current,
        {
          types: ['address'],
          fields: ['formatted_address', 'geometry', 'address_components']
        }
      );

      console.log('✅ Autocomplete instance created');

      const handlePlaceSelect = () => {
        const place = autocompleteRef.current?.getPlace();
        console.log('📍 Place selected:', place);
        
        if (place?.formatted_address) {
          // Prevent the click from bubbling up to parent elements
          setTimeout(() => {
            onChange(place.formatted_address);
            console.log('✅ Address updated:', place.formatted_address);
          }, 0);
        } else {
          console.warn('⚠️ No formatted address in place result');
        }
      };

      autocompleteRef.current.addListener('place_changed', handlePlaceSelect);
      console.log('✅ Place change listener added');
      
      // Test that autocomplete is working
      setTimeout(() => {
        if (autocompleteRef.current) {
          console.log('✅ Autocomplete still active after 1s');
        }
      }, 1000);
      
    } catch (error: any) {
      console.error('❌ Error initializing autocomplete:', error);
      console.error('Error details:', {
        message: error?.message,
        stack: error?.stack
      });
      setLoadError('Failed to initialize address autocomplete');
      setIsManualMode(true);
    }

    return () => {
      if (autocompleteRef.current && window.google) {
        console.log('🧹 Cleaning up autocomplete listeners');
        window.google.maps.event.clearInstanceListeners(autocompleteRef.current);
      }
    };
  }, [isGoogleMapsLoaded, isManualMode, onChange]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  };

  const toggleManualMode = () => {
    console.log('🔄 Toggling manual mode:', !isManualMode);
    setIsManualMode(!isManualMode);
    setLoadError(null);
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
      
      {loadError && (
        <Alert variant="destructive" className="mt-2">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-sm">
            {loadError}
          </AlertDescription>
        </Alert>
      )}
      
      {!apiKey && !loadError && (
        <p className="text-sm text-muted-foreground">
          Add Google Maps API key to enable address autocomplete
        </p>
      )}
    </div>
  );
};
