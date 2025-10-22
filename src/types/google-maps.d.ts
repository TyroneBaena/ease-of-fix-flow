
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
        addListener(eventName: string, handler: () => void): MapsEventListener;
        getPlace(): PlaceResult;
        getBounds(): LatLngBounds | undefined;
        setBounds(bounds: LatLngBounds | LatLngBoundsLiteral | undefined): void;
        setComponentRestrictions(restrictions: ComponentRestrictions | null): void;
        setFields(fields: string[] | undefined): void;
        setOptions(options: AutocompleteOptions): void;
        setTypes(types: string[] | null): void;
      }
      
      interface AutocompleteOptions {
        bounds?: LatLngBounds | LatLngBoundsLiteral;
        componentRestrictions?: ComponentRestrictions;
        fields?: string[];
        strictBounds?: boolean;
        types?: string[];
      }
      
      interface ComponentRestrictions {
        country?: string | string[];
      }
      
      interface PlaceResult {
        address_components?: AddressComponent[];
        formatted_address?: string;
        geometry?: PlaceGeometry;
        name?: string;
        place_id?: string;
        types?: string[];
        url?: string;
        vicinity?: string;
      }
      
      interface PlaceGeometry {
        location?: LatLng;
        viewport?: LatLngBounds;
      }
      
      interface AddressComponent {
        long_name: string;
        short_name: string;
        types: string[];
      }
    }
    
    interface LatLngBounds {
      contains(latLng: LatLng | LatLngLiteral): boolean;
      equals(other: LatLngBounds | LatLngBoundsLiteral | null): boolean;
      extend(point: LatLng | LatLngLiteral): LatLngBounds;
      getCenter(): LatLng;
      getNorthEast(): LatLng;
      getSouthWest(): LatLng;
      intersects(other: LatLngBounds | LatLngBoundsLiteral): boolean;
      isEmpty(): boolean;
      toJSON(): LatLngBoundsLiteral;
      toSpan(): LatLng;
      toString(): string;
      toUrlValue(precision?: number): string;
      union(other: LatLngBounds | LatLngBoundsLiteral): LatLngBounds;
    }
    
    interface LatLngBoundsLiteral {
      east: number;
      north: number;
      south: number;
      west: number;
    }
    
    interface MapsEventListener {
      remove(): void;
    }
    
    namespace event {
      function addListener(instance: any, eventName: string, handler: Function): MapsEventListener;
      function addListenerOnce(instance: any, eventName: string, handler: Function): MapsEventListener;
      function clearInstanceListeners(instance: any): void;
      function clearListeners(instance: any, eventName: string): void;
      function removeListener(listener: MapsEventListener): void;
      function trigger(instance: any, eventName: string, ...args: any[]): void;
    }
  }
}
