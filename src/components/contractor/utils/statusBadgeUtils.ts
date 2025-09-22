
export const getStatusBadgeColor = (status: "pending" | "in-progress" | "completed" | "open" | "requested" | "cancelled") => {
  switch (status) {
    case "pending":
      return "bg-yellow-100 text-yellow-800";
    case "requested":
      return "bg-yellow-100 text-yellow-800";
    case "in-progress":
      return "bg-blue-100 text-blue-800";
    case "completed":
      return "bg-green-100 text-green-800";
    case "cancelled":
      return "bg-red-100 text-red-800";
    case "open":
      return "bg-amber-100 text-amber-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
};

// Helper function to get badge color for quote status
export const getQuoteStatusBadgeColor = (status: string) => {
  switch (status) {
    case "requested":
      return "bg-purple-100 text-purple-800";
    case "pending":
      return "bg-orange-100 text-orange-800"; // Quote submitted, waiting for review
    case "submitted":
      return "bg-blue-100 text-blue-800"; // Quote under admin review
    case "approved":
      return "bg-green-100 text-green-800";
    case "rejected":
      return "bg-red-100 text-red-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
};
