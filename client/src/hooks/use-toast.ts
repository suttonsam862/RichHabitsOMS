import { useCallback } from "react";
import {
  Toast,
  ToastProps,
} from "@/components/ui/toast";

import {
  useToast as useToastImpl,
} from "@/components/ui/use-toast";

// Simple toast options interface
interface ToastOptions {
  title?: string;
  description?: string;
  variant?: 'default' | 'destructive';
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function useToast() {
  const { toast, dismiss, ...rest } = useToastImpl();

  const showToast = useCallback(
    (options: ToastOptions) => {
      const { title, description, action, ...props } = options;

      return toast({
        title,
        description,
        action,
        ...props,
      });
    },
    [toast]
  );

  return {
    toast: showToast,
    dismiss,
    ...rest,
  };
}
