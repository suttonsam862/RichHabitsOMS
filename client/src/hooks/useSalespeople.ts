/**
 * React Query hooks for salesperson management
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  getSalespeople, 
  getSalesperson, 
  createSalesperson, 
  updateSalesperson, 
  deleteSalesperson,
  assignCustomerToSalesperson,
  type Salesperson 
} from '@/lib/salespersonApi';
import { useToast } from '@/hooks/use-toast';

/**
 * Hook to fetch all salespeople
 */
export function useSalespeople() {
  return useQuery({
    queryKey: ['salespeople'],
    queryFn: async () => {
      const response = await getSalespeople();
      return response.data || [];
    },
  });
}

/**
 * Hook to fetch single salesperson by ID
 */
export function useSalesperson(id: string) {
  return useQuery({
    queryKey: ['salespeople', id],
    queryFn: async () => {
      const response = await getSalesperson(id);
      return response.data;
    },
    enabled: !!id,
  });
}

/**
 * Hook to create new salesperson
 */
export function useCreateSalesperson() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (salespersonData: Partial<Salesperson>) => {
      const response = await createSalesperson(salespersonData);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['salespeople'] });
      toast({
        title: 'Salesperson Created',
        description: `${data?.first_name} ${data?.last_name} has been added successfully.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create salesperson',
        variant: 'destructive',
      });
    },
  });
}

/**
 * Hook to update existing salesperson
 */
export function useUpdateSalesperson() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Salesperson> }) => {
      const response = await updateSalesperson(id, data);
      return response.data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['salespeople'] });
      queryClient.invalidateQueries({ queryKey: ['salespeople', variables.id] });
      toast({
        title: 'Salesperson Updated',
        description: `${data?.first_name} ${data?.last_name} has been updated successfully.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update salesperson',
        variant: 'destructive',
      });
    },
  });
}

/**
 * Hook to delete salesperson
 */
export function useDeleteSalesperson() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await deleteSalesperson(id);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salespeople'] });
      toast({
        title: 'Salesperson Deleted',
        description: 'Salesperson has been removed successfully.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete salesperson',
        variant: 'destructive',
      });
    },
  });
}

/**
 * Hook to assign customer to salesperson
 */
export function useAssignCustomer() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ customerId, salespersonId, assignmentType = 'primary' }: {
      customerId: string;
      salespersonId: string;
      assignmentType?: string;
    }) => {
      const response = await assignCustomerToSalesperson(customerId, salespersonId, assignmentType);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salespeople'] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      toast({
        title: 'Assignment Updated',
        description: 'Customer has been assigned to salesperson successfully.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to assign customer',
        variant: 'destructive',
      });
    },
  });
}