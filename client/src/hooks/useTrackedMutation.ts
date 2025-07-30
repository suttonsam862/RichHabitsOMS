import { useMutation, UseMutationOptions, UseMutationResult } from '@tanstack/react-query';
import { useMutationTracker } from '../context/MutationContext';
import { useEffect, useRef } from 'react';

export function useTrackedMutation<
  TData = unknown,
  TError = Error,
  TVariables = void,
  TContext = unknown
>(
  options: UseMutationOptions<TData, TError, TVariables, TContext> & {
    mutationId?: string;
    trackAsLongRunning?: boolean;
  }
): UseMutationResult<TData, TError, TVariables, TContext> {
  const { registerMutation, unregisterMutation } = useMutationTracker();
  const mutationIdRef = useRef(
    options.mutationId || `mutation_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  );
  const trackAsLongRunning = options.trackAsLongRunning ?? true;

  const mutation = useMutation({
    ...options,
    onMutate: async (variables) => {
      if (trackAsLongRunning) {
        registerMutation(mutationIdRef.current);
      }
      return options.onMutate?.(variables);
    },
    onSuccess: (data, variables, context) => {
      if (trackAsLongRunning) {
        unregisterMutation(mutationIdRef.current);
      }
      return options.onSuccess?.(data, variables, context);
    },
    onError: (error, variables, context) => {
      if (trackAsLongRunning) {
        unregisterMutation(mutationIdRef.current);
      }
      return options.onError?.(error, variables, context);
    },
    onSettled: (data, error, variables, context) => {
      if (trackAsLongRunning) {
        unregisterMutation(mutationIdRef.current);
      }
      return options.onSettled?.(data, error, variables, context);
    },
  });

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (trackAsLongRunning) {
        unregisterMutation(mutationIdRef.current);
      }
    };
  }, [unregisterMutation, trackAsLongRunning]);

  return mutation;
}