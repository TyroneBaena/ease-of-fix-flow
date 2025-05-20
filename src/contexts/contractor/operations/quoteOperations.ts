
// Make sure this import exists at the top of the file
import { supabase } from '@/lib/supabase';

// Type definition for include info
export interface IncludeInfo {
  description: boolean;
  location: boolean;
  images: boolean;
  contactDetails: boolean;
  urgency: boolean;
}

// Update the requestQuote function to accept the new IncludeInfo type
export const requestQuote = async (
  requestId: string,
  contractorId: string,
  includeInfo: IncludeInfo,
  notes: string
) => {
  console.log(`Requesting quote for request ${requestId} from contractor ${contractorId}`);
  console.log("Include info:", includeInfo);
  console.log("Notes:", notes);

  // Here you would typically have the API call to update the database
  // For now, we'll simulate a successful operation with a delay
  return new Promise<void>((resolve) => {
    setTimeout(() => {
      console.log("Quote request successful");
      resolve();
    }, 1000);
  });
};
