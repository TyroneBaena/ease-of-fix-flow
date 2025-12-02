import { supabase } from "@/lib/supabase";

interface UserNameResult {
  name: string;
  role: string;
}

/**
 * Gets a user's display name by checking multiple sources:
 * 1. profiles.name
 * 2. For contractors: contractors.contact_name or contractors.company_name
 * 3. Fallback to email prefix
 * 4. Final fallback: "Unknown User"
 */
export async function getUserDisplayName(userId: string): Promise<UserNameResult> {
  // Step 1: Get profile data
  const { data: profileData } = await supabase
    .from("profiles")
    .select("name, role, email")
    .eq("id", userId)
    .single();

  const role = profileData?.role || "user";
  let name = profileData?.name;

  // Step 2: If name is empty/null, check role-specific tables
  if (!name || name.trim() === "") {
    if (role === "contractor") {
      // Check contractors table for contact_name or company_name
      const { data: contractorData } = await supabase
        .from("contractors")
        .select("contact_name, company_name")
        .eq("user_id", userId)
        .single();

      name = contractorData?.contact_name || contractorData?.company_name;
    }
    
    // Final fallback: use email prefix or "Unknown User"
    if (!name || name.trim() === "") {
      name = profileData?.email?.split("@")[0] || "Unknown User";
    }
  }

  return { name, role };
}
