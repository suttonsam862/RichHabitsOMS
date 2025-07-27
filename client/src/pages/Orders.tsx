import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { getQueryFn } from '@/lib/queryClient';
import { useAuth } from '@/hooks/use-auth';
import { formatCurrency, formatDate, getStatusColor, getStatusLabel } from '@/lib/utils';
import { apiRequest } from '@/lib/queryClient';
import { 
  PlusCircle, 
  Search, 
  Filter, 
  Eye, 
  Edit, 
  Calendar, 
  User, 
  DollarSign, 
  FileText,
  RefreshCw 
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { Order } from '@/types';
import { AlertTriangle } from 'lucide-react';

function OrdersContent() {
  const navigate = useNavigate();
  const { role } = useAuth();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  
  // Fetch orders
  const { data: orders = [], isLoading, refetch } = useQuery<Order[]>({
    queryKey: ['/api/orders'],
    queryFn: getQueryFn({ on401: 'throw' }),
  });

  // Fetch catalog items for future integration
  const { data: catalogItems = [] } = useQuery({
    queryKey: ['/api/catalog'],
    queryFn: async () => {
      try {
        const response = await apiRequest('GET', '/api/catalog');
        return response || [];
      } catch (error) {
        console.warn('Catalog not yet available:', error);
        return [];
      }
    },
    retry: false,
    refetchOnWindowFocus: false,
  });
  
  // Filter orders based on search term and status
  const filteredOrders = orders.filter(order => {
    if (!order) return false;
    
    const matchesSearch = search === '' || 
      (order.orderNumber && order.orderNumber.toLowerCase().includes(search.toLowerCase())) ||
      (order.customer?.user?.firstName && order.customer?.user?.lastName && 
       (order.customer.user.firstName + ' ' + order.customer.user.lastName).toLowerCase().includes(search.toLowerCase()));
    
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });
  
  // Get unique statuses for filter dropdown
  const statuses = [...new Set(orders.map(order => order.status))];
  
  // Calculate order totals
  const getOrderTotal = (order: Order) => {
    return order.items.reduce((total, item) => {
      const itemTotal = typeof item.totalPrice === 'string' 
        ? parseFloat(item.totalPrice) 
        : item.totalPrice;
      return total + itemTotal;
    }, 0);
  };

  return (
    <div className="space-y-6 pb-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
            <FileText className="h-6 w-6 text-primary hidden sm:inline-flex" />
            Orders
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            View and manage all customer clothing orders
          </p>
        </div>
        
        {/* Only allow admin and salesperson to create orders */}
        {(role === 'admin' || role === 'salesperson') && (
          <Button 
            onClick={() => navigate('/orders/edit/new')}
            className="w-full sm:w-auto shadow-sm"
            size="sm"
          >
            <PlusCircle className="mr-2 h-4 w-4" />
            Create New Order
          </Button>
        )}
      </div>
      
      <Card className="shadow-sm border-gray-200">
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
            <div>
              <CardTitle className="text-lg text-gray-900">Order Management</CardTitle>
              <CardDescription className="text-sm text-gray-500">
                Browse, filter, and manage all orders in the system
              </CardDescription>
            </div>
            
            <div className="mt-2 sm:mt-0">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="h-8 gap-1"
                      onClick={() => {
                        // Refresh orders query using the refetch function
                        refetch();
                      }}
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                      <span className="sm:inline hidden">Refresh</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Refresh orders</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by order # or customer name..."
                className="pl-9 h-10 border-gray-200 focus:border-primary"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select
              value={statusFilter}
              onValueChange={setStatusFilter}
            >
              <SelectTrigger className="w-full sm:w-[180px] h-10 border-gray-200">
                <Filter className="mr-2 h-4 w-4 text-gray-500" />
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {statuses.filter(status => status && status.trim() !== '').map(status => (
                  <SelectItem key={status} value={status}>
                    {getStatusLabel(status)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {/* Desktop view - Table */}
          <div className="rounded-md border border-gray-200 overflow-hidden hidden md:block">
            <ScrollArea className="max-h-[calc(100vh-300px)]">
              <Table>
                <TableHeader className="bg-gray-50">
                  <TableRow>
                    <TableHead className="w-[100px] font-medium">Order #</TableHead>
                    <TableHead className="font-medium">
                      <div className="flex items-center gap-1">
                        <User className="h-3.5 w-3.5 text-gray-400" />
                        Customer
                      </div>
                    </TableHead>
                    <TableHead className="font-medium">Status</TableHead>
                    <TableHead className="font-medium">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5 text-gray-400" />
                        Created
                      </div>
                    </TableHead>
                    <TableHead className="text-right font-medium">
                      <div className="flex items-center justify-end gap-1">
                        <DollarSign className="h-3.5 w-3.5 text-gray-400" />
                        Total
                      </div>
                    </TableHead>
                    <TableHead className="w-[100px] text-center font-medium">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    Array(5).fill(0).map((_, index) => (
                      <TableRow key={index}>
                        <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                        <TableCell className="text-center"><Skeleton className="h-8 w-16 mx-auto" /></TableCell>
                      </TableRow>
                    ))
                  ) : filteredOrders.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center">
                        <div className="flex flex-col items-center justify-center text-gray-500">
                          <FileText className="h-8 w-8 mb-2 text-gray-300" />
                          <p>No orders found matching your criteria.</p>
                          <p className="text-sm">Try adjusting your search or filter.</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredOrders.map((order) => (
                      <TableRow 
                        key={order.id} 
                        className="cursor-pointer transition-colors hover:bg-gray-50" 
                        onClick={() => navigate(`/orders/${order.id}`)}
                      >
                        <TableCell className="font-medium text-primary">{order.orderNumber}</TableCell>
                        <TableCell>
                          {order.customer?.user?.firstName && order.customer?.user?.lastName ? 
                            `${order.customer.user.firstName} ${order.customer.user.lastName}` : 
                            'Unknown Customer'}
                        </TableCell>
                        <TableCell>
                          <Badge 
                            className={`${getStatusColor(order.status)} px-2 py-0.5`}
                            variant="outline"
                          >
                            {getStatusLabel(order.status)}
                          </Badge>
                        </TableCell>
                        <TableCell>{formatDate(order.createdAt)}</TableCell>
                        <TableCell className="text-right font-medium">{formatCurrency(getOrderTotal(order))}</TableCell>
                        <TableCell>
                          <div className="flex items-center justify-center gap-2">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      navigate(`/orders/${order.id}`);
                                    }}
                                  >
                                    <Eye className="h-4 w-4 text-gray-500" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>View details</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            
                            {(role === 'admin' || role === 'salesperson') && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-8 w-8 p-0"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        navigate(`/orders/edit/${order.id}`);
                                      }}
                                    >
                                      <Edit className="h-4 w-4 text-gray-500" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Edit order</TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
          </div>
          
          {/* Mobile view - Card layout */}
          <div className="md:hidden space-y-4">
            {isLoading ? (
              Array(3).fill(0).map((_, index) => (
                <Card key={index} className="overflow-hidden">
                  <div className="p-4 space-y-3">
                    <div className="flex justify-between">
                      <Skeleton className="h-5 w-24" />
                      <Skeleton className="h-6 w-20" />
                    </div>
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-3/4" />
                    </div>
                    <div className="flex justify-between pt-2">
                      <Skeleton className="h-5 w-20" />
                      <Skeleton className="h-9 w-20" />
                    </div>
                  </div>
                </Card>
              ))
            ) : filteredOrders.length === 0 ? (
              <div className="text-center py-12 border rounded-md bg-gray-50">
                <FileText className="h-10 w-10 mx-auto text-gray-300 mb-3" />
                <h3 className="text-gray-700 font-medium">No orders found</h3>
                <p className="text-sm text-gray-500 mt-1">Try adjusting your search or filter.</p>
              </div>
            ) : (
              filteredOrders.map((order) => (
                <Card 
                  key={order.id} 
                  className="overflow-hidden border-gray-200 shadow-sm"
                  onClick={() => navigate(`/orders/${order.id}`)}
                >
                  <div className="p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <div className="font-medium text-primary">{order.orderNumber}</div>
                        <div className="text-sm text-gray-500">
                          {formatDate(order.createdAt)}
                        </div>
                      </div>
                      <Badge 
                        className={`${getStatusColor(order.status)} px-2`}
                        variant="outline"
                      >
                        {getStatusLabel(order.status)}
                      </Badge>
                    </div>
                    
                    <div className="mb-3">
                      <div className="text-sm text-gray-500 flex items-center gap-1.5">
                        <User className="h-3.5 w-3.5" />
                        {order.customer?.user?.firstName && order.customer?.user?.lastName ? 
                          `${order.customer.user.firstName} ${order.customer.user.lastName}` : 
                          'Unknown Customer'}
                      </div>
                    </div>
                    
                    <div className="pt-2 mt-2 border-t flex justify-between items-center">
                      <div className="font-medium">
                        {formatCurrency(getOrderTotal(order))}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-9"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/orders/${order.id}`);
                          }}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                        
                        {(role === 'admin' || role === 'salesperson') && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-9"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/orders/edit/${order.id}`);
                            }}
                          >
                            <Edit className="h-4 w-4 mr-1" />
                            Edit
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
          
          {/* Pagination would go here if needed */}
          {!isLoading && filteredOrders.length > 0 && (
            <div className="mt-4 text-sm text-gray-500 text-center">
              Showing {filteredOrders.length} of {orders.length} orders
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function Orders() {
  return (
    <div className="min-h-screen">
      <ErrorBoundary
        fallback={({ error, resetError }) => (
          <div className="flex flex-col items-center justify-center min-h-screen">
            <AlertTriangle className="h-12 w-12 text-red-500 mb-4" />
            <h2 className="text-xl font-semibold mb-2">Something went wrong</h2>
            <p className="text-gray-600 mb-4">There was an error loading the orders page.</p>
            <Button onClick={() => window.location.reload()}>
              Refresh Page
            </Button>
          </div>
        )}
      >
        <OrdersContent />
      </ErrorBoundary>
    </div>
  );
}