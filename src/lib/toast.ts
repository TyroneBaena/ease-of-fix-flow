
// Export a simplified toast interface based on the sonner library
import { toast as sonnerToast } from "sonner";
import { useToast } from "@/hooks/use-toast";

// Default sonner-based implementation
const toast = {
  success: (message: string) => sonnerToast.success(message),
  error: (message: string) => sonnerToast.error(message),
  info: (message: string) => sonnerToast.info(message),
  warning: (message: string) => sonnerToast.warning(message),
};

// Export the toast utility
export { toast };

