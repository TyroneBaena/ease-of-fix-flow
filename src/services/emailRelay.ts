
import { supabase } from "@/integrations/supabase/client";

/**
 * Helper to notify a landlord by email with Reply-To that threads back into activity.
 * Call this after you mark the maintenance request as "assigned to landlord".
 */
export async function notifyLandlordAssignment(requestId: string, landlordEmail: string, landlordName?: string) {
  const { data: session } = await supabase.auth.getSession();
  const accessToken = session.session?.access_token;
  if (!accessToken) {
    throw new Error("Not authenticated");
  }

  const { data, error } = await supabase.functions.invoke("notify-landlord-assignment", {
    body: {
      request_id: requestId,
      landlord_email: landlordEmail,
      landlord_name: landlordName,
    },
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (error) {
    console.error("notifyLandlordAssignment error:", error);
    throw error;
  }
  return data;
}
