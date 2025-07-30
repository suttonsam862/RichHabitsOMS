import React from 'react';
import { ComponentErrorBoundary } from '@/components/error/ComponentErrorBoundary';
import { useErrorBoundary } from '@/hooks/useErrorBoundary';
// import OrderForm from '@/components/orders/OrderForm'; // Will be uncommented when OrderForm exists

interface SafeOrderFormProps {
  initialData?: any;
  onSubmit: (data: any) => void;
}

/**
 * Order Form wrapped with error boundary and async error handling
 */
export function SafeOrderForm({ initialData, onSubmit }: SafeOrderFormProps) {
  const { wrapAsync } = useErrorBoundary();

  // Wrap the onSubmit handler to catch async errors
  const safeOnSubmit = wrapAsync(
    onSubmit,
    'Failed to submit order form'
  );

  return (
    <ComponentErrorBoundary 
      componentName="Order Form"
      onRetry={() => {
        // Optionally reset form state or refetch data
        console.log('Retrying Order Form...');
      }}
    >
      {/* <OrderForm 
        initialData={initialData}
        onSubmit={safeOnSubmit}
      /> */}
      <div className="p-4 border rounded-lg">
        <h3 className="text-lg font-semibold mb-4">Order Form (Safe)</h3>
        <p className="text-gray-600">
          Order form component will be wrapped here with error boundary protection.
        </p>
      </div>
    </ComponentErrorBoundary>
  );
}

export default SafeOrderForm;