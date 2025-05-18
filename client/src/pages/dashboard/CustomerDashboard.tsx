import { useAuth } from '@/hooks/use-auth';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ShoppingBag, FileText, MessageSquare, PieChart, Tag } from 'lucide-react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { CustomerNavigation } from '@/components/customer/CustomerNavigation';

// Define dashboard data type
interface CustomerDashboardData {
  customer: {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
  };
  metrics: {
    totalOrders: number;
    activeOrders: number;
    designsNeedingApproval: number;
    totalSpent: string;
  };
  orderStatusCounts: Record<string, number>;
  recentOrders: Array<any>;
  recentMessages: Array<any>;
}

export default function CustomerDashboard() {
  const { user } = useAuth();
  
  // Get customer dashboard data from dedicated API endpoint
  const { data: dashboardData, isLoading } = useQuery<CustomerDashboardData>({
    queryKey: ['customer', 'dashboard'],
    queryFn: async () => {
      const response = await fetch('/api/customer/dashboard');
      if (!response.ok) {
        throw new Error('Failed to fetch customer dashboard data');
      }
      return response.json();
    }
  });
  
  if (!user) return null;
  
  // Extract dashboard metrics
  const metrics = dashboardData?.metrics || {
    totalOrders: 0,
    activeOrders: 0,
    designsNeedingApproval: 0,
    totalSpent: '0.00'
  };
  
  const recentOrders = dashboardData?.recentOrders || [];
  const recentMessages = dashboardData?.recentMessages || [];
  
  return (
    <div className="space-y-6">
      <div className="mb-6 border-b pb-4">
        <CustomerNavigation />
      </div>
    
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Customer Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome, {dashboardData?.customer?.firstName || user.firstName || user.username}
        </p>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <ShoppingBag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            ) : (
              <>
                <div className="text-2xl font-bold">{metrics.totalOrders}</div>
                <p className="text-xs text-muted-foreground">
                  Lifetime orders
                </p>
              </>
            )}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Orders</CardTitle>
            <Tag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            ) : (
              <>
                <div className="text-2xl font-bold">{metrics.activeOrders}</div>
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
            {isLoading ? (
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            ) : (
              <>
                <div className="text-2xl font-bold">{metrics.designsNeedingApproval}</div>
                <p className="text-xs text-muted-foreground">
                  {metrics.designsNeedingApproval === 1 ? 'Design' : 'Designs'} pending review
                </p>
              </>
            )}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Spent</CardTitle>
            <PieChart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            ) : (
              <>
                <div className="text-2xl font-bold">${metrics.totalSpent}</div>
                <p className="text-xs text-muted-foreground">
                  Lifetime spending
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
              <Link to="/customer/orders">View All</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {isLoading ? (
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
              <Link to="/customer/messages">View All</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {isLoading ? (
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