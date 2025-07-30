import React from 'react';
import { ComponentErrorBoundary } from '@/components/error/ComponentErrorBoundary';
import { useErrorBoundary } from '@/hooks/useErrorBoundary';

interface SafeAddCustomerProps {
  onCustomerAdded?: (customer: any) => void;
  onCancel?: () => void;
}

/**
 * Add Customer component wrapped with error boundary
 * Note: This is a placeholder as the actual AddCustomer component wasn't found
 */
export function SafeAddCustomer({ onCustomerAdded, onCancel }: SafeAddCustomerProps) {
  const { wrapAsync } = useErrorBoundary();

  const safeOnCustomerAdded = wrapAsync(
    onCustomerAdded || (() => {}),
    'Failed to add customer'
  );

  return (
    <ComponentErrorBoundary 
      componentName="Add Customer"
      onRetry={() => {
        console.log('Retrying Add Customer...');
      }}
    >
      <div className="p-4 border rounded-lg">
        <h3 className="text-lg font-semibold mb-4">Add New Customer</h3>
        <p className="text-gray-600 mb-4">
          Add Customer form will be implemented here with proper error handling.
        </p>
        <div className="flex gap-2">
          <button 
            onClick={() => safeOnCustomerAdded({ id: Date.now(), name: 'Test Customer' })}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Add Customer
          </button>
          <button 
            onClick={onCancel}
            className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
          >
            Cancel
          </button>
        </div>
      </div>
    </ComponentErrorBoundary>
  );
}

export default SafeAddCustomer;