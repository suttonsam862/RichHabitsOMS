import { useCallback } from "react";
import {
  Toast,
  ToastActionElement,
  ToastProps,
} from "@/components/ui/toast";

import {
  useToast as useToastImpl,
} from "@/components/ui/use-toast";

export type ToastActionProps = React.ComponentPropsWithoutRef<typeof ToastActionElement>

type ToastOptions = Omit<ToastProps, "id"> & {
  action?: ToastActionProps;
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
