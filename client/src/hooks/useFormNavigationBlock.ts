import { useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

interface UseFormNavigationBlockOptions {
  when: boolean;
  message?: string;
}

export function useFormNavigationBlock({ 
  when, 
  message = "You have unsaved changes. Are you sure you want to leave?" 
}: UseFormNavigationBlockOptions) {
  const navigate = useNavigate();

  // Block browser navigation (refresh, back button, closing tab)
  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (when) {
        event.preventDefault();
        event.returnValue = message;
        return message;
      }
    };

    if (when) {
      window.addEventListener('beforeunload', handleBeforeUnload);
      return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }
  }, [when, message]);

  // Block React Router navigation
  useEffect(() => {
    if (when) {
      const originalPushState = window.history.pushState;
      const originalReplaceState = window.history.replaceState;
      
      const blockNavigation = () => {
        if (when && !window.confirm(message)) {
          return;
        }
      };

      // Override history methods to show confirmation
      window.history.pushState = function(...args) {
        if (when && !window.confirm(message)) {
          return;
        }
        return originalPushState.apply(this, args);
      };

      window.history.replaceState = function(...args) {
        if (when && !window.confirm(message)) {
          return;
        }
        return originalReplaceState.apply(this, args);
      };

      return () => {
        window.history.pushState = originalPushState;
        window.history.replaceState = originalReplaceState;
      };
    }
  }, [when, message]);

  return {
    isBlocking: when
  };
}