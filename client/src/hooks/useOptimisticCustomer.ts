import { useOptimisticUpdate } from './useOptimisticUpdate';

interface Customer {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  status: 'active' | 'inactive' | 'suspended';
  priority: 'low' | 'medium' | 'high';
  [key: string]: any;
}

export function useOptimisticCustomerStatus(customer: Customer) {
  return useOptimisticUpdate(customer, {
    queryKey: '/api/customers',
    field: 'status' as keyof Customer,
    apiCall: async (status: Customer['status']) => {
      const response = await fetch(`/api/customers/${customer.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token') || 'dev-admin-token-12345'}`
        },
        body: JSON.stringify({ status }),
      });
      return { ...customer, status };
    },
    successMessage: `Customer status updated to ${customer.status}`,
    errorMessage: 'Failed to update customer status',
  });
}

export function useOptimisticCustomerPriority(customer: Customer) {
  return useOptimisticUpdate(customer, {
    queryKey: '/api/customers',
    field: 'priority' as keyof Customer,
    apiCall: async (priority: Customer['priority']) => {
      const response = await fetch(`/api/customers/${customer.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token') || 'dev-admin-token-12345'}`
        },
        body: JSON.stringify({ priority }),
      });
      return { ...customer, priority };
    },
    successMessage: `Customer priority updated to ${customer.priority}`,
    errorMessage: 'Failed to update customer priority',
  });
}