
declare namespace google {
  namespace maps {
    class Map {
      constructor(mapDiv: Element, opts?: MapOptions);
    }
    
    interface MapOptions {
      center?: LatLng | LatLngLiteral;
      zoom?: number;
    }
    
    class LatLng {
      constructor(lat: number, lng: number);
      lat(): number;
      lng(): number;
    }
    
    interface LatLngLiteral {
      lat: number;
      lng: number;
    }
    
    namespace places {
      class Autocomplete {
        constructor(inputField: HTMLInputElement, opts?: AutocompleteOptions);
        addListener(eventName: string, handler: () => void): void;
        getPlace(): PlaceResult;
      }
      
      interface AutocompleteOptions {
        types?: string[];
        fields?: string[];
      }
      
      interface PlaceResult {
        formatted_address?: string;
        geometry?: {
          location?: LatLng;
        };
        address_components?: AddressComponent[];
      }
      
      interface AddressComponent {
        long_name: string;
        short_name: string;
        types: string[];
      }
    }
    
    namespace event {
      function clearInstanceListeners(instance: any): void;
    }
  }
}
