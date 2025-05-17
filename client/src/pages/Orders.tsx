import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Eye, Plus, Search } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { getQueryFn } from '@/lib/queryClient';
import { formatCurrency } from '@/lib/utils';

export default function Orders() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  
  // Fetch orders based on user role
  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['/api/orders'],
    queryFn: getQueryFn({ on401: 'throw' }),
  });

  // Helper to get status badge color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft':
        return 'bg-gray-200 text-gray-800';
      case 'pending_design':
        return 'bg-yellow-200 text-yellow-800';
      case 'design_in_progress':
        return 'bg-blue-200 text-blue-800';
      case 'design_review':
        return 'bg-purple-200 text-purple-800';
      case 'design_approved':
        return 'bg-green-200 text-green-800';
      case 'pending_production':
        return 'bg-orange-200 text-orange-800';
      case 'in_production':
        return 'bg-indigo-200 text-indigo-800';
      case 'completed':
        return 'bg-green-200 text-green-800';
      case 'cancelled':
        return 'bg-red-200 text-red-800';
      default:
        return 'bg-gray-200 text-gray-800';
    }
  };

  // Format status for display
  const formatStatus = (status: string) => {
    return status.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  // Filter orders based on search
  const filteredOrders = orders.filter((order: any) =>
    order.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (order.customer?.firstName && order.customer.firstName.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (order.customer?.lastName && order.customer.lastName.toLowerCase().includes(searchQuery.toLowerCase())) ||
    order.status.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Orders</h1>
          <p className="text-muted-foreground">
            View and manage custom clothing orders
          </p>
        </div>
        
        {/* Only show create button for admin or salesperson */}
        {(user?.role === 'admin' || user?.role === 'salesperson') && (
          <Button onClick={() => navigate('/orders/new')}>
            <Plus className="mr-2 h-4 w-4" /> Create Order
          </Button>
        )}
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle>All Orders</CardTitle>
          <CardDescription>
            Manage and track the status of customer orders
          </CardDescription>
          <div className="relative mt-2">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search orders..."
              className="pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32">
              <p className="text-center text-muted-foreground">No orders found</p>
              {(user?.role === 'admin' || user?.role === 'salesperson') && (
                <Button 
                  variant="outline" 
                  className="mt-2"
                  onClick={() => navigate('/orders/new')}
                >
                  <Plus className="mr-2 h-4 w-4" /> Create New Order
                </Button>
              )}
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order #</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrders.map((order: any) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-medium">{order.orderNumber}</TableCell>
                      <TableCell>
                        {order.customer?.firstName} {order.customer?.lastName}
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(order.status)}>
                          {formatStatus(order.status)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(order.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(parseFloat(order.totalAmount))}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => navigate(`/orders/${order.id}`)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}