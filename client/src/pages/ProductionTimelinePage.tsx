import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ProductionImageTimeline } from '@/components/ProductionImageTimeline';
import { ArrowLeft, Package, User, Calendar, DollarSign } from 'lucide-react';

export default function ProductionTimelinePage() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();

  const { data: order, isLoading } = useQuery({
    queryKey: ['order', orderId],
    queryFn: async () => {
      const response = await fetch(`/api/orders/${orderId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch order');
      }

      return response.json();
    },
    enabled: !!orderId
  });

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-12">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Order not found</h2>
          <p className="text-gray-500 mt-2">The requested order could not be found.</p>
          <Button 
            onClick={() => navigate('/orders')} 
            className="mt-4"
          >
            Back to Orders
          </Button>
        </div>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'draft':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
      case 'design':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300';
      case 'production':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-300';
      case 'completed':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate('/orders')}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Orders
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Production Timeline
          </h1>
          <p className="text-gray-500">
            Visual timeline of production progress for {order.orderNumber || order.order_number}
          </p>
        </div>
      </div>

      {/* Order Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Order Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                <Package className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Order Number</p>
                <p className="font-medium">{order.orderNumber || order.order_number}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
                <DollarSign className="h-4 w-4 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Status</p>
                <Badge className={getStatusColor(order.status)}>
                  {order.status?.charAt(0).toUpperCase() + order.status?.slice(1)}
                </Badge>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
                <User className="h-4 w-4 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Customer</p>
                <p className="font-medium">{order.customer?.name || order.customerId}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 dark:bg-orange-900/20 rounded-lg">
                <Calendar className="h-4 w-4 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Created</p>
                <p className="font-medium">
                  {new Date(order.createdAt || order.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Production Timeline */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Timeline - Takes 2/3 of the space */}
        <div className="lg:col-span-2">
          <ProductionImageTimeline orderId={orderId!} />
        </div>

        {/* Order Details Sidebar */}
        <div className="space-y-6">
          {/* Order Items */}
          {order.items && order.items.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Order Items</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {order.items.map((item: any, index: number) => (
                  <div key={index} className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <p className="font-medium text-sm">
                          {item.productName || item.product_name}
                        </p>
                        {(item.size || item.color) && (
                          <p className="text-xs text-gray-500 mt-1">
                            {[item.size, item.color].filter(Boolean).join(' • ')}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">
                          ${(item.unitPrice || item.unit_price || 0).toFixed(2)}
                        </p>
                        <p className="text-xs text-gray-500">
                          Qty: {item.quantity}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Notes */}
          {(order.notes || order.internalNotes || order.internal_notes) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Notes</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {order.notes && (
                  <div>
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Customer Notes</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{order.notes}</p>
                  </div>
                )}
                {(order.internalNotes || order.internal_notes) && (
                  <div>
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Internal Notes</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      {order.internalNotes || order.internal_notes}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button 
                variant="outline" 
                className="w-full justify-start"
                onClick={() => navigate(`/orders/edit/${orderId}`)}
              >
                Edit Order
              </Button>
              <Button 
                variant="outline" 
                className="w-full justify-start"
                onClick={() => navigate('/orders')}
              >
                View All Orders
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}