/**
 * v79.1 - Minimal Visibility Coordinator with Flag Reset
 * 
 * ARCHITECTURAL PRINCIPLE:
 * - React Query handles ALL data refetching via refetchOnWindowFocus
 * - This coordinator adds ONE minimal callback for resetting stuck flags
 * - Purpose: Reset fetchInProgress flags that can get stuck on tab revisits
 */

class VisibilityCoordinator {
  private isListening = false;
  private resetCallbacks: Array<() => void> = [];

  /**
   * Start listening for visibility changes
   */
  public startListening() {
    if (this.isListening) return;
    this.isListening = true;
    document.addEventListener("visibilitychange", this.handleVisibilityChange);
    console.log("👀 v79.1 - Visibility coordinator listening (with flag reset)");
  }

  /**
   * Stop listening
   */
  public stopListening() {
    if (!this.isListening) return;
    this.isListening = false;
    document.removeEventListener("visibilitychange", this.handleVisibilityChange);
    console.log("👀 v79.1 - Stopped listening");
  }

  /**
   * v79.1: Register a callback to reset flags on tab return
   */
  public registerResetCallback(callback: () => void) {
    this.resetCallbacks.push(callback);
    console.log("👀 v79.1 - Reset callback registered");
  }

  /**
   * v79.1: Unregister a callback
   */
  public unregisterResetCallback(callback: () => void) {
    this.resetCallbacks = this.resetCallbacks.filter(cb => cb !== callback);
    console.log("👀 v79.1 - Reset callback unregistered");
  }

  /**
   * v79.1: Call reset callbacks on tab return to prevent stuck flags
   */
  private handleVisibilityChange = async () => {
    if (document.hidden) {
      console.log("🔒 v79.1 - Tab hidden");
    } else {
      console.log("🔓 v79.1 - Tab visible - Resetting flags");
      // Reset any stuck flags
      this.resetCallbacks.forEach(callback => {
        try {
          callback();
        } catch (error) {
          console.error("❌ v79.1 - Error in reset callback:", error);
        }
      });
    }
  };
}

export const visibilityCoordinator = new VisibilityCoordinator();
