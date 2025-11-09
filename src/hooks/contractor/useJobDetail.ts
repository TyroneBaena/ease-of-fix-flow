// import { useState, useEffect } from 'react';
// import { supabase } from '@/lib/supabase';
// import { MaintenanceRequest } from '@/types/maintenance';
// import { toast } from '@/lib/toast';

// interface PropertyData {
//   address?: string;
//   contact_number?: string;
//   practice_leader?: string;
//   practice_leader_phone?: string;
//   practice_leader_email?: string;
// }

// export const useJobDetail = (jobId: string | undefined) => {
//   const [loading, setLoading] = useState(true);
//   const [job, setJob] = useState<MaintenanceRequest | null>(null);
//   const [error, setError] = useState<string | null>(null);
//   const [refreshCounter, setRefreshCounter] = useState(0);

//   useEffect(() => {
//     if (!jobId) return;

//     const fetchJobDetails = async () => {
//       try {
//         setLoading(true);

//         console.log('Fetching job details for ID:', jobId);

//         // Fetch the job details - new RLS policies will handle access control automatically
//         const { data, error } = await supabase
//           .from('maintenance_requests')
//           .select(`
//             *,
//             quotes(*)
//           `)
//           .eq('id', jobId)
//           .single();

//         if (error) {
//           console.error('Database error fetching job:', error);
//           throw error;
//         }

//         if (data) {
//           console.log('Raw maintenance request data:', data);

//           // Fetch the property data separately if needed
//           let propertyData: PropertyData = {};
//           if (data.property_id) {
//             console.log('Fetching property data for property ID:', data.property_id);
//             const { data: property, error: propertyError } = await supabase
//               .from('properties')
//               .select('address, contact_number, practice_leader, practice_leader_phone, practice_leader_email')
//               .eq('id', data.property_id)
//               .maybeSingle();

//             if (propertyError) {
//               console.warn('Could not fetch property data:', propertyError);
//               // Don't throw error, just continue without property data
//             } else {
//               propertyData = property || {};
//               console.log('Fetched property data:', propertyData);
//             }
//           }

//           // Helper function to safely handle potentially non-array JSON fields
//           const safeArrayFromJSON = (jsonField: any): any[] => {
//             if (!jsonField) return [];
//             if (Array.isArray(jsonField)) return jsonField;
//             try {
//               const parsed = typeof jsonField === 'string' ? JSON.parse(jsonField) : jsonField;
//               return Array.isArray(parsed) ? parsed : [];
//             } catch (e) {
//               console.warn('Failed to parse JSON array:', e);
//               return [];
//             }
//           };

//           console.log('useJobDetail - Raw status from database:', data.status);

//           const formattedJob: MaintenanceRequest = {
//             id: data.id,
//             title: data.title,
//             description: data.description || data.explanation || '',
//             status: data.status as 'pending' | 'in-progress' | 'completed' | 'open',
//             location: data.location || '',
//             priority: data.priority as 'low' | 'medium' | 'high' || 'medium',
//             site: data.site || data.category || '',
//             submittedBy: data.submitted_by || 'Unknown',
//             date: data.created_at,
//             propertyId: data.property_id,
//             contactNumber: propertyData.contact_number || '',
//             address: propertyData.address || '',
//             practiceLeader: propertyData.practice_leader || '',
//             practiceLeaderPhone: propertyData.practice_leader_phone || '',
//             practiceLeaderEmail: propertyData.practice_leader_email || '',
//             attachments: safeArrayFromJSON(data.attachments),
//             category: data.category,
//             createdAt: data.created_at,
//             updatedAt: data.updated_at,
//             dueDate: data.due_date,
//             assignedTo: data.assigned_to,
//             history: safeArrayFromJSON(data.history),
//             isParticipantRelated: data.is_participant_related || false,
//             participantName: data.participant_name || 'N/A',
//             attemptedFix: data.attempted_fix || '',
//             issueNature: data.issue_nature || '',
//             explanation: data.explanation || '',
//             reportDate: data.report_date || '',
//             contractorId: data.contractor_id,
//             assignedAt: data.assigned_at,
//             completionPercentage: data.completion_percentage || 0,
//             completionPhotos: safeArrayFromJSON(data.completion_photos),
//             progressNotes: safeArrayFromJSON(data.progress_notes),
//             quoteRequested: data.quote_requested || false,
//             quotedAmount: data.quoted_amount,
//             quotes: data.quotes && data.quotes.length > 0 ? data.quotes : undefined,
//             userId: data.user_id || 'unknown-user'
//           };

//           console.log('Successfully formatted job data with contact info:', {
//             jobId: formattedJob.id,
//             practiceLeader: formattedJob.practiceLeader,
//             practiceLeaderEmail: formattedJob.practiceLeaderEmail,
//             practiceLeaderPhone: formattedJob.practiceLeaderPhone,
//             address: formattedJob.address
//           });

//           setJob(formattedJob);
//         } else {
//           setError('Job not found or access denied');
//         }
//       } catch (err) {
//         console.error('Error fetching job details:', err);
//         setError('Failed to load job details');
//         toast.error('Failed to load job details. Please check your permissions.');
//       } finally {
//         setLoading(false);
//       }
//     };

//     fetchJobDetails();
//   }, [jobId, refreshCounter]);

//   const refetch = () => {
//     setRefreshCounter(prev => prev + 1);
//   };

//   return { job, loading, error, refetch };
// };

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { MaintenanceRequest } from "@/types/maintenance";
import { toast } from "@/lib/toast";
import { useUnifiedAuth, waitForSessionReady } from "@/contexts/UnifiedAuthContext";

interface PropertyData {
  address?: string;
  contact_number?: string;
  practice_leader?: string;
  practice_leader_phone?: string;
  practice_leader_email?: string;
}

export const useJobDetail = (jobId: string | undefined) => {
  const [loading, setLoading] = useState(true);
  const [job, setJob] = useState<MaintenanceRequest | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshCounter, setRefreshCounter] = useState(0);
  const { sessionVersion } = useUnifiedAuth(); // v97.1: Use sessionVersion for proper coordination

  useEffect(() => {
    if (!jobId) return;

    const fetchJobDetails = async () => {
      // v97.1: CRITICAL - Wait for specific session version to be ready
      console.log(`⏳ v97.1 - useJobDetail: Waiting for session version ${sessionVersion} to be ready...`);
      const isReady = await waitForSessionReady(sessionVersion, 10000);

      if (!isReady) {
        console.warn("⚠️ v97.1 - useJobDetail: Session not ready after timeout");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);

        console.log(
          `✅ v97.1 - useJobDetail: Session version ${sessionVersion} ready, fetching job details for ID:`,
          jobId,
        );

        // Fetch the job details - new RLS policies will handle access control automatically
        const { data, error } = await supabase
          .from("maintenance_requests")
          .select(
            `
            *,
            quotes(*)
          `,
          )
          .eq("id", jobId)
          .single();

        if (error) {
          console.error("Database error fetching job:", error);
          throw error;
        }

        if (data) {
          console.log("Raw maintenance request data:", data);

          // Fetch the property data separately if needed
          let propertyData: PropertyData = {};
          if (data.property_id) {
            console.log("Fetching property data for property ID:", data.property_id);
            const { data: property, error: propertyError } = await supabase
              .from("properties")
              .select("address, contact_number, practice_leader, practice_leader_phone, practice_leader_email")
              .eq("id", data.property_id)
              .maybeSingle();

            if (propertyError) {
              console.warn("Could not fetch property data:", propertyError);
              // Don't throw error, just continue without property data
            } else {
              propertyData = property || {};
              console.log("Fetched property data:", propertyData);
            }
          }

          // Helper function to safely handle potentially non-array JSON fields
          const safeArrayFromJSON = (jsonField: any): any[] => {
            if (!jsonField) return [];
            if (Array.isArray(jsonField)) return jsonField;
            try {
              const parsed = typeof jsonField === "string" ? JSON.parse(jsonField) : jsonField;
              return Array.isArray(parsed) ? parsed : [];
            } catch (e) {
              console.warn("Failed to parse JSON array:", e);
              return [];
            }
          };

          console.log("useJobDetail - Raw status from database:", data.status);

          const formattedJob: MaintenanceRequest = {
            id: data.id,
            title: data.title,
            description: data.description || data.explanation || "",
            status: data.status as "pending" | "in-progress" | "completed" | "open",
            location: data.location || "",
            priority: (data.priority as "low" | "medium" | "high") || "medium",
            site: data.site || data.category || "",
            submittedBy: data.submitted_by || "Unknown",
            date: data.created_at,
            propertyId: data.property_id,
            contactNumber: propertyData.contact_number || "",
            address: propertyData.address || "",
            practiceLeader: propertyData.practice_leader || "",
            practiceLeaderPhone: propertyData.practice_leader_phone || "",
            practiceLeaderEmail: propertyData.practice_leader_email || "",
            attachments: safeArrayFromJSON(data.attachments),
            category: data.category,
            createdAt: data.created_at,
            updatedAt: data.updated_at,
            dueDate: data.due_date,
            assignedTo: data.assigned_to,
            history: safeArrayFromJSON(data.history),
            isParticipantRelated: data.is_participant_related || false,
            participantName: data.participant_name || "N/A",
            attemptedFix: data.attempted_fix || "",
            issueNature: data.issue_nature || "",
            explanation: data.explanation || "",
            reportDate: data.report_date || "",
            contractorId: data.contractor_id,
            assignedAt: data.assigned_at,
            completionPercentage: data.completion_percentage || 0,
            completionPhotos: safeArrayFromJSON(data.completion_photos),
            progressNotes: safeArrayFromJSON(data.progress_notes),
            quoteRequested: data.quote_requested || false,
            quotedAmount: data.quoted_amount,
            quotes: data.quotes && data.quotes.length > 0 ? data.quotes : undefined,
            userId: data.user_id || "unknown-user",
          };

          console.log("Successfully formatted job data with contact info:", {
            jobId: formattedJob.id,
            practiceLeader: formattedJob.practiceLeader,
            practiceLeaderEmail: formattedJob.practiceLeaderEmail,
            practiceLeaderPhone: formattedJob.practiceLeaderPhone,
            address: formattedJob.address,
          });

          setJob(formattedJob);
        } else {
          setError("Job not found or access denied");
        }
      } catch (err) {
        console.error("Error fetching job details:", err);
        setError("Failed to load job details");
        toast.error("Failed to load job details. Please check your permissions.");
      } finally {
        setLoading(false);
      }
    };

    fetchJobDetails();
  }, [jobId, refreshCounter, sessionVersion]); // v97.1: Use sessionVersion for proper coordination

  const refetch = () => {
    setRefreshCounter((prev) => prev + 1);
  };

  return { job, loading, error, refetch };
};
