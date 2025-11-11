/**
 * v79.0 - Minimal Passive Visibility Coordinator
 * 
 * ARCHITECTURAL PRINCIPLE:
 * - React Query handles ALL data refetching via refetchOnWindowFocus
 * - This coordinator is now COMPLETELY PASSIVE
 * - Only purpose: Listen to visibility changes for potential future use
 * - No callbacks, no orchestration, no manual refresh logic
 */

class VisibilityCoordinator {
  private isListening = false;

  /**
   * Start listening for visibility changes
   */
  public startListening() {
    if (this.isListening) return;
    this.isListening = true;
    document.addEventListener("visibilitychange", this.handleVisibilityChange);
    console.log("👀 v79.0 - Visibility coordinator listening (passive mode)");
  }

  /**
   * Stop listening
   */
  public stopListening() {
    if (!this.isListening) return;
    this.isListening = false;
    document.removeEventListener("visibilitychange", this.handleVisibilityChange);
    console.log("👀 v79.0 - Stopped listening");
  }

  /**
   * v79.0: Completely passive - just log visibility changes
   */
  private handleVisibilityChange = async () => {
    if (document.hidden) {
      console.log("🔒 v79.0 - Tab hidden");
    } else {
      console.log("🔓 v79.0 - Tab visible - React Query handles everything");
    }
  };
}

export const visibilityCoordinator = new VisibilityCoordinator();
