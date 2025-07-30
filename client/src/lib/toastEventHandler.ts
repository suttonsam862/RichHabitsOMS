/**
 * Toast Event Handler for cross-component error notifications
 */
import { useToast } from '@/hooks/use-toast';

export interface ToastEventDetail {
  title: string;
  description: string;
  variant?: 'default' | 'destructive';
  duration?: number;
}

class ToastEventHandler {
  private initialized = false;

  public initialize() {
    if (this.initialized) return;

    // Listen for custom toast events
    window.addEventListener('showToast', this.handleToastEvent);
    this.initialized = true;
    console.log('Toast event handler initialized');
  }

  private handleToastEvent = (event: CustomEvent<ToastEventDetail>) => {
    const { title, description, variant = 'default', duration } = event.detail;
    
    // Dispatch a direct toast event since we can't use the hook here
    console.log(`Toast: ${title} - ${description}`);
    
    // Create a synthetic toast by dispatching to the existing toast system
    const toastEvent = new CustomEvent('globalToast', {
      detail: { title, description, variant, duration }
    });
    window.dispatchEvent(toastEvent);
  };

  public destroy() {
    window.removeEventListener('showToast', this.handleToastEvent);
    this.initialized = false;
  }

  // Utility method to dispatch toast events
  public static showToast(detail: ToastEventDetail) {
    window.dispatchEvent(new CustomEvent('showToast', { detail }));
  }
}

export const toastEventHandler = new ToastEventHandler();

// Utility function for easy toast dispatching
export const showToast = (detail: ToastEventDetail) => {
  ToastEventHandler.showToast(detail);
};