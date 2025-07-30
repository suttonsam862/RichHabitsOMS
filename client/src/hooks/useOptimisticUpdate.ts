import { useState, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';

interface OptimisticUpdateOptions<T extends { id: string | number }, K extends keyof T> {
  queryKey: string | string[];
  field: K;
  apiCall: (value: T[K]) => Promise<any>;
  onSuccess?: (data: any) => void;
  onError?: (error: any) => void;
  successMessage?: string;
  errorMessage?: string;
}

export function useOptimisticUpdate<T extends { id: string | number }, K extends keyof T>(
  initialData: T,
  options: OptimisticUpdateOptions<T, K>
) {
  const queryClient = useQueryClient();
  const [optimisticData, setOptimisticData] = useState<T>(initialData);
  const [isOptimistic, setIsOptimistic] = useState(false);
  const { toast } = useToast();

  const mutation = useMutation({
    mutationFn: options.apiCall,
    onMutate: async (newValue: T[K]) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: [options.queryKey] });

      // Snapshot the previous value
      const previousData = queryClient.getQueryData([options.queryKey]);

      // Optimistically update the UI
      const updatedData = { ...optimisticData, [options.field]: newValue };
      setOptimisticData(updatedData);
      setIsOptimistic(true);

      // Optimistically update the cache
      queryClient.setQueryData([options.queryKey], (old: any) => {
        if (Array.isArray(old?.data?.items)) {
          return {
            ...old,
            data: {
              ...old.data,
              items: old.data.items.map((item: any) => 
                item.id === initialData.id 
                  ? { ...item, [options.field]: newValue }
                  : item
              )
            }
          };
        }
        return old;
      });

      return { previousData };
    },
    onError: (err, newValue, context) => {
      // Revert optimistic update on error
      setOptimisticData(initialData);
      setIsOptimistic(false);

      // Restore previous cache data
      if (context?.previousData) {
        queryClient.setQueryData([options.queryKey], context.previousData);
      }

      toast({
        title: "Error",
        description: options.errorMessage || "Failed to update. Please try again.",
        variant: "destructive",
      });

      options.onError?.(err);
    },
    onSuccess: (data) => {
      // Update with server response
      setOptimisticData(data);
      setIsOptimistic(false);

      // Invalidate and refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: [options.queryKey] });

      if (options.successMessage) {
        toast({
          title: "Success",
          description: options.successMessage,
        });
      }

      options.onSuccess?.(data);
    },
  });

  const updateField = useCallback((newValue: T[K]) => {
    mutation.mutate(newValue);
  }, [mutation]);

  const toggleField = useCallback(() => {
    if (typeof optimisticData[options.field] === 'boolean') {
      const newValue = !optimisticData[options.field] as T[K];
      updateField(newValue);
    }
  }, [optimisticData, options.field, updateField]);

  return {
    data: optimisticData,
    isOptimistic,
    isPending: mutation.isPending,
    updateField,
    toggleField,
    error: mutation.error,
  };
}