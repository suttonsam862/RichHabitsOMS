import { useAuth } from '@/hooks/use-auth';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ShoppingBag, FileText, MessageSquare, Clock, AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';

export default function CustomerDashboard() {
  const { user } = useAuth();
  
  // Get customer's orders
  const { data: orders, isLoading: isLoadingOrders } = useQuery({
    queryKey: ['orders'],
    queryFn: async () => {
      const response = await fetch('/api/orders');
      if (!response.ok) {
        throw new Error('Failed to fetch orders');
      }
      return response.json();
    }
  });
  
  // Get customer's messages
  const { data: messages, isLoading: isLoadingMessages } = useQuery({
    queryKey: ['messages'],
    queryFn: async () => {
      const response = await fetch('/api/messages');
      if (!response.ok) {
        throw new Error('Failed to fetch messages');
      }
      return response.json();
    }
  });
  
  if (!user) return null;
  
  // Calculate dashboard metrics
  const activeOrders = orders?.filter(order => 
    order.status !== 'completed' && order.status !== 'cancelled'
  ) || [];
  
  const designsNeedingApproval = orders?.filter(order => 
    order.status === 'design_review'
  ) || [];
  
  const totalSpent = orders?.reduce((sum, order) => {
    return sum + (parseFloat(order.totalAmount || '0') || 0);
  }, 0).toFixed(2) || '0.00';
  
  // Get recent orders (limited to 5)
  const recentOrders = [...(orders || [])].sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  ).slice(0, 5);
  
  // Get recent messages (limited to 5)
  const recentMessages = [...(messages || [])].sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  ).slice(0, 5);
  
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Customer Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome, {user.firstName || user.username}
        </p>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Orders</CardTitle>
            <ShoppingBag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoadingOrders ? (
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            ) : (
              <>
                <div className="text-2xl font-bold">{activeOrders.length}</div>
                <p className="text-xs text-muted-foreground">
                  In progress orders
                </p>
              </>
            )}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Design Approvals</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoadingOrders ? (
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            ) : (
              <>
                <div className="text-2xl font-bold">{designsNeedingApproval.length}</div>
                <p className="text-xs text-muted-foreground">
                  {designsNeedingApproval.length === 1 ? 'Design' : 'Designs'} pending your review
                </p>
              </>
            )}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Spent</CardTitle>
            <ShoppingBag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoadingOrders ? (
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            ) : (
              <>
                <div className="text-2xl font-bold">${totalSpent}</div>
                <p className="text-xs text-muted-foreground">
                  Lifetime orders
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="col-span-1">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent Orders</CardTitle>
            <Button variant="outline" size="sm" asChild>
              <Link to="/orders">View All</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {isLoadingOrders ? (
              <div className="flex justify-center py-4">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            ) : recentOrders.length > 0 ? (
              <div className="space-y-4">
                {recentOrders.map(order => (
                  <div key={order.id} className="flex items-center justify-between border-b pb-2">
                    <div>
                      <Link to={`/orders/${order.id}`} className="font-medium hover:underline">
                        {order.orderNumber}
                      </Link>
                      <div className="text-xs text-muted-foreground">
                        {order.createdAt ? format(new Date(order.createdAt), 'MMM d, yyyy') : ''}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={order.status === 'completed' ? 'default' : 'outline'}>
                        {order.status.replace(/_/g, ' ')}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-6 text-center">
                <ShoppingBag className="mb-2 h-12 w-12 text-muted-foreground opacity-50" />
                <h3 className="text-lg font-medium">No orders yet</h3>
                <p className="text-sm text-muted-foreground">
                  You haven't placed any orders yet.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
        
        <Card className="col-span-1">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent Messages</CardTitle>
            <Button variant="outline" size="sm" asChild>
              <Link to="/messages">View All</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {isLoadingMessages ? (
              <div className="flex justify-center py-4">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            ) : recentMessages && recentMessages.length > 0 ? (
              <div className="space-y-4">
                {recentMessages.map(message => (
                  <div key={message.id} className="flex items-start gap-3 border-b pb-2">
                    <MessageSquare className="h-5 w-5 text-muted-foreground" />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <div className="font-medium">{message.senderName || 'System'}</div>
                        <div className="text-xs text-muted-foreground">
                          {message.createdAt ? format(new Date(message.createdAt), 'MMM d, h:mm a') : ''}
                        </div>
                      </div>
                      <div className="line-clamp-1 text-sm text-muted-foreground">
                        {message.content}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-6 text-center">
                <MessageSquare className="mb-2 h-12 w-12 text-muted-foreground opacity-50" />
                <h3 className="text-lg font-medium">No messages yet</h3>
                <p className="text-sm text-muted-foreground">
                  You don't have any messages in your inbox.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}