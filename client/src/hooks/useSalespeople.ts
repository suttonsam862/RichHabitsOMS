
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Salesperson } from '@shared/types';
import * as salespersonApi from '@/lib/salespersonApi';

// TODO: wire these to salespersonApi functions
export function useSalespeople() {
  return useQuery({
    queryKey: ['salespeople'],
    queryFn: salespersonApi.getSalespeople,
    // TODO: add error handling and caching strategy
  });
}

export function useSalesperson(id: string) {
  return useQuery({
    queryKey: ['salesperson', id],
    queryFn: () => salespersonApi.getSalesperson(id),
    enabled: !!id,
    // TODO: add error handling
  });
}

export function useCreateSalesperson() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: salespersonApi.createSalesperson,
    onSuccess: () => {
      // TODO: invalidate and refetch queries
      queryClient.invalidateQueries({ queryKey: ['salespeople'] });
    },
    // TODO: add error handling and optimistic updates
  });
}

export function useUpdateSalesperson() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Salesperson> }) =>
      salespersonApi.updateSalesperson(id, data),
    onSuccess: (_, { id }) => {
      // TODO: invalidate and refetch queries
      queryClient.invalidateQueries({ queryKey: ['salesperson', id] });
      queryClient.invalidateQueries({ queryKey: ['salespeople'] });
    },
    // TODO: add error handling and optimistic updates
  });
}

export function useDeleteSalesperson() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: salespersonApi.deleteSalesperson,
    onSuccess: () => {
      // TODO: invalidate and refetch queries
      queryClient.invalidateQueries({ queryKey: ['salespeople'] });
    },
    // TODO: add error handling and cleanup
  });
}

// TODO: add assignment hooks
export function useAssignSalesperson() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ customerId, salespersonId }: { customerId: string; salespersonId: string }) =>
      salespersonApi.assignSalespersonToCustomer(customerId, salespersonId),
    onSuccess: () => {
      // TODO: invalidate customer and salesperson queries
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
  });
}

export function useUnassignSalesperson() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: salespersonApi.unassignSalespersonFromCustomer,
    onSuccess: () => {
      // TODO: invalidate customer queries
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
  });
}

// TODO: add file upload hooks
export function useUploadSalespersonProfileImage() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, file }: { id: string; file: File }) =>
      salespersonApi.uploadSalespersonProfileImage(id, file),
    onSuccess: (_, { id }) => {
      // TODO: invalidate salesperson query
      queryClient.invalidateQueries({ queryKey: ['salesperson', id] });
    },
  });
}

export function useUploadSalespersonPayrollFile() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, file }: { id: string; file: File }) =>
      salespersonApi.uploadSalespersonPayrollFile(id, file),
    onSuccess: (_, { id }) => {
      // TODO: invalidate salesperson query
      queryClient.invalidateQueries({ queryKey: ['salesperson', id] });
    },
  });
}
