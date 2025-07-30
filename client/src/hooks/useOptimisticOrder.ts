import { useOptimisticUpdate } from './useOptimisticUpdate';

interface Order {
  id: string;
  orderNumber: string;
  status: 'draft' | 'design' | 'production' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high';
  rushOrder: boolean;
  [key: string]: any;
}

export function useOptimisticOrderStatus(order: Order) {
  return useOptimisticUpdate(order, {
    queryKey: '/api/orders',
    field: 'status' as keyof Order,
    apiCall: async (status: Order['status']) => {
      const response = await fetch(`/api/orders/${order.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token') || 'dev-admin-token-12345'}`
        },
        body: JSON.stringify({ status }),
      });
      return { ...order, status };
    },
    successMessage: `Order ${order.orderNumber} status updated to ${order.status}`,
    errorMessage: 'Failed to update order status',
  });
}

export function useOptimisticOrderPriority(order: Order) {
  return useOptimisticUpdate(order, {
    queryKey: '/api/orders',
    field: 'priority' as keyof Order,
    apiCall: async (priority: Order['priority']) => {
      const response = await fetch(`/api/orders/${order.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token') || 'dev-admin-token-12345'}`
        },
        body: JSON.stringify({ priority }),
      });
      return { ...order, priority };
    },
    successMessage: `Order ${order.orderNumber} priority updated to ${order.priority}`,
    errorMessage: 'Failed to update order priority',
  });
}

export function useOptimisticRushOrder(order: Order) {
  return useOptimisticUpdate(order, {
    queryKey: '/api/orders',
    field: 'rushOrder' as keyof Order,
    apiCall: async (rushOrder: boolean) => {
      const response = await fetch(`/api/orders/${order.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token') || 'dev-admin-token-12345'}`
        },
        body: JSON.stringify({ rush_order: rushOrder }),
      });
      return { ...order, rushOrder };
    },
    successMessage: `Order ${order.orderNumber} ${order.rushOrder ? 'marked as rush' : 'rush removed'}`,
    errorMessage: 'Failed to update rush order status',
  });
}