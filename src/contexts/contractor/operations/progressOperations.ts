import { supabase } from "@/lib/supabase";

import { logActivity } from "./helpers/activityHelpers";

// Send email notifications for status changes (cancelled/reopened)
const sendStatusChangeNotification = async (
  requestId: string,
  newStatus: 'cancelled' | 'reopened',
  actorName: string
) => {
  try {
    console.log(`📧 Sending ${newStatus} status notification for request:`, requestId);

    // Get request details with property info
    const { data: request } = await supabase
      .from("maintenance_requests")
      .select(`
        *,
        properties:property_id (
          name,
          address,
          email,
          practice_leader_email,
          practice_leader
        )
      `)
      .eq("id", requestId)
      .single();

    if (!request || !request.properties) {
      console.log("No request or property found for status notification");
      return;
    }

    const notificationData = {
      request_id: requestId,
      request_title: request.title || "",
      request_description: request.description || "",
      request_location: request.location || "",
      request_priority: request.priority || "",
      request_status: newStatus,
      property_name: request.properties.name || "",
      property_address: request.properties.address || "",
      comment_text: `Request has been ${newStatus} by ${actorName}`,
      commenter_name: actorName,
      commenter_role: "contractor",
      comment_date: new Date().toISOString(),
      direct_link: `${window.location.origin}/requests/${requestId}`,
    };

    const recipients: { email: string; name: string }[] = [];

    // Add practice leader email
    if (request.properties.practice_leader_email) {
      recipients.push({
        email: request.properties.practice_leader_email,
        name: request.properties.practice_leader || "Practice Leader"
      });
    }

    // Add property email
    if (request.properties.email) {
      recipients.push({
        email: request.properties.email,
        name: request.properties.name || "Property Contact"
      });
    }

    // Send emails to all recipients (deduped)
    const sentEmails = new Set<string>();
    for (const recipient of recipients) {
      if (sentEmails.has(recipient.email)) continue;
      
      console.log(`📬 Sending ${newStatus} notification to:`, recipient.email);
      const { data, error } = await supabase.functions.invoke("send-comment-notification", {
        body: {
          recipient_email: recipient.email,
          recipient_name: recipient.name,
          notification_data: notificationData,
        },
      });
      
      if (error) {
        console.error(`Error sending email to ${recipient.email}:`, error);
      } else {
        console.log(`✅ Email sent to ${recipient.email}:`, data);
      }
      
      sentEmails.add(recipient.email);
    }

    console.log(`✅ Status change notifications sent to ${sentEmails.size} recipients`);
  } catch (error) {
    console.error("Error sending status change notification:", error);
    // Don't throw to prevent breaking the main operation
  }
};

export const updateJobProgressStatus = async (
  requestId: string,
  progress: number,
  notes?: string,
  completionPhotos?: Array<{ url: string }>,
  action?: "complete" | "reopen" | "cancel",
) => {
  console.log(`🚀 updateJobProgressStatus - STARTING UPDATE for request ${requestId}`);
  console.log(`🚀 updateJobProgressStatus - Progress: ${progress}%`);
  console.log(`🚀 updateJobProgressStatus - Notes:`, notes);
  console.log(`🚀 updateJobProgressStatus - Completion photos:`, completionPhotos);

  // First, let's check current status in database
  const { data: currentData } = await supabase
    .from("maintenance_requests")
    .select("id, status, completion_percentage")
    .eq("id", requestId)
    .single();

  console.log(
    `🚀 BEFORE UPDATE - Current status: ${currentData?.status}, Current progress: ${currentData?.completion_percentage}%`,
  );

  const updates: any = {
    completion_percentage: progress,
  };

  if (notes) {
    const { data: currentRequest } = await supabase
      .from("maintenance_requests")
      .select("progress_notes")
      .eq("id", requestId)
      .single();

    updates.progress_notes = [...(currentRequest?.progress_notes || []), notes];
  }

  if (completionPhotos && completionPhotos.length > 0) {
    updates.completion_photos = completionPhotos;
  }

  // Update status based on progress and action - simplified logic
  console.log(`updateJobProgressStatus - Determining status update for progress: ${progress}%, action: ${action}`);

  if (action === "cancel") {
    console.log("updateJobProgressStatus - Setting status to cancelled");
    updates.status = "cancelled";
  } else if (action === "reopen") {
    console.log("updateJobProgressStatus - Setting status to in-progress (reopened)");
    updates.status = "in-progress";
  } else if (progress === 100) {
    console.log("updateJobProgressStatus - Setting status to completed");
    updates.status = "completed";
  } else if (progress > 0) {
    // Always set to in-progress if there's any progress > 0
    console.log("updateJobProgressStatus - Progress > 0, setting status to in-progress");
    updates.status = "in-progress";
  } else {
    console.log("updateJobProgressStatus - Progress is 0, not updating status");
  }

  console.log(`updateJobProgressStatus - Database updates:`, updates);

  console.log(`updateJobProgressStatus - Attempting database update with requestId: ${requestId}`);
  console.log(`updateJobProgressStatus - Update object:`, JSON.stringify(updates, null, 2));

  const { data, error } = await supabase.from("maintenance_requests").update(updates).eq("id", requestId).select("*");

  console.log(`updateJobProgressStatus - Database response data:`, data);
  console.log(`updateJobProgressStatus - Database response error:`, error);

  if (error) {
    console.error("updateJobProgressStatus - Database update error:", error);
    throw error;
  }

  console.log(`🚀 updateJobProgressStatus - Database update successful:`, data);
  console.log(`🚀 AFTER UPDATE - New status: ${data?.[0]?.status}, New progress: ${data?.[0]?.completion_percentage}%`);

  // Verify the update took effect by fetching again
  const { data: verifyData } = await supabase
    .from("maintenance_requests")
    .select("id, status, completion_percentage")
    .eq("id", requestId)
    .single();

  console.log(
    `🚀 VERIFICATION - Actual status in DB: ${verifyData?.status}, Actual progress: ${verifyData?.completion_percentage}%`,
  );

  // Get contractor information for activity logging
  console.log("updateJobProgressStatus - Getting contractor information for activity logging");
  const { data: userData } = await supabase.auth.getUser();
  console.log("updateJobProgressStatus - Current user:", userData.user?.id);

  const { data: contractorData, error: contractorError } = await supabase
    .from("contractors")
    .select("contact_name")
    .eq("user_id", userData.user?.id)
    .single();

  if (contractorError) {
    console.error("updateJobProgressStatus - Error fetching contractor data:", contractorError);
  }
  console.log("updateJobProgressStatus - Contractor data:", contractorData);

  // Log activity based on progress
  console.log("updateJobProgressStatus - Logging activity for progress:", progress);
  if (progress === 100) {
    console.log("updateJobProgressStatus - Logging job completion activity");
    await logActivity({
      requestId,
      actionType: "job_completed",
      description: `Job marked as completed with ${completionPhotos?.length || 0} completion photos`,
      actorName: contractorData?.contact_name || "Unknown Contractor",
      actorRole: "contractor",
      metadata: {
        progress_percentage: progress,
        completion_photos_count: completionPhotos?.length || 0,
        completion_photos: completionPhotos,
        notes: notes,
      },
    });

    // Send email notification for job completion
    console.log("updateJobProgressStatus - Sending job completion notification");
    await sendJobCompletionNotification(
      requestId,
      contractorData?.contact_name || "Unknown Contractor",
      completionPhotos,
    );
  } else if (action === "cancel") {
    // Log cancellation activity
    console.log("updateJobProgressStatus - Logging job cancellation activity");
    await logActivity({
      requestId,
      actionType: "job_cancelled",
      description: `Job has been cancelled${notes ? `: ${notes}` : ""}`,
      actorName: contractorData?.contact_name || "Unknown Contractor",
      actorRole: "contractor",
      metadata: {
        progress_percentage: progress,
        notes: notes,
      },
    });

    // Send email notification for cancellation
    console.log("updateJobProgressStatus - Sending cancellation notification");
    await sendStatusChangeNotification(
      requestId,
      "cancelled",
      contractorData?.contact_name || "Unknown Contractor"
    );
  } else if (action === "reopen") {
    // Log reopening activity
    console.log("updateJobProgressStatus - Logging job reopen activity");
    await logActivity({
      requestId,
      actionType: "job_reopened",
      description: `Job has been reopened${notes ? `: ${notes}` : ""}`,
      actorName: contractorData?.contact_name || "Unknown Contractor",
      actorRole: "contractor",
      metadata: {
        progress_percentage: progress,
        notes: notes,
      },
    });

    // Send email notification for reopening
    console.log("updateJobProgressStatus - Sending reopen notification");
    await sendStatusChangeNotification(
      requestId,
      "reopened",
      contractorData?.contact_name || "Unknown Contractor"
    );
  } else {
    console.log("updateJobProgressStatus - Logging progress update activity");
    await logActivity({
      requestId,
      actionType: "progress_updated",
      description: `Progress updated to ${progress}%${notes ? ` with notes: ${notes}` : ""}`,
      actorName: contractorData?.contact_name || "Unknown Contractor",
      actorRole: "contractor",
      metadata: {
        progress_percentage: progress,
        notes: notes,
        photos_uploaded: completionPhotos?.length || 0,
      },
    });
  }

  console.log("updateJobProgressStatus - Operation completed successfully");
};

const sendJobCompletionNotification = async (
  requestId: string,
  contractorName: string,
  completionPhotos?: Array<{ url: string }>,
) => {
  try {
    // Get request details for email notification
    const { data: request } = await supabase
      .from("maintenance_requests")
      .select(
        `
        *,
        properties:property_id (
          name,
          address
        )
      `,
      )
      .eq("id", requestId)
      .single();

    if (!request) return;

    // Get admin and manager users
    const { data: adminUsers } = await supabase
      .from("profiles")
      .select("id, email, name")
      .in("role", ["admin", "manager"])
      .not("email", "is", null);

    // Get request owner
    const { data: requestOwner } = await supabase
      .from("profiles")
      .select("id, email, name")
      .eq("id", request.user_id)
      .single();

    const notificationData = {
      request_id: requestId,
      request_title: request.title || "",
      request_description: request.description || "",
      request_location: request.location || "",
      request_priority: request.priority || "",
      request_status: "completed",
      property_name: request.properties?.name || "",
      property_address: request.properties?.address || "",
      comment_text: `Job has been completed by ${contractorName}${completionPhotos?.length ? ` with ${completionPhotos.length} completion photos` : ""}`,
      commenter_name: contractorName,
      commenter_role: "contractor",
      comment_date: new Date().toISOString(),
      direct_link: `${window.location.origin}/requests/${requestId}`,
      completion_photos: completionPhotos,
    };

    // Send notifications to admin/manager users
    if (adminUsers) {
      for (const user of adminUsers) {
        if (user.email) {
          await supabase.functions.invoke("send-comment-notification", {
            body: {
              recipient_email: user.email,
              recipient_name: user.name || "",
              notification_data: notificationData,
            },
          });
        }
      }
    }

    // Send notification to request owner
    if (requestOwner?.email) {
      await supabase.functions.invoke("send-comment-notification", {
        body: {
          recipient_email: requestOwner.email,
          recipient_name: requestOwner.name || "",
          notification_data: notificationData,
        },
      });
    }
  } catch (error) {
    console.error("Error sending job completion notification:", error);
    // Don't throw here to prevent breaking the main operation
  }
};
