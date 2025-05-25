import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { 
  Plus, 
  ClipboardList, 
  Package, 
  TrendingUp,
  Users,
  DollarSign,
  Clock
} from 'lucide-react';
import { Link } from 'wouter';

// Import your existing components
import OrderManagePage from './orders/OrderManagePage';
import OrderCreatePage from './orders/OrderCreatePage';

export default function OrdersHub() {
  const [activeTab, setActiveTab] = useState('overview');

  // Fetch order statistics for the overview
  const { data: statsData, isLoading: loadingStats } = useQuery({
    queryKey: ['/api/orders/stats'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/orders/stats');
      if (!response.ok) {
        // If stats endpoint doesn't exist, return mock data for layout
        return {
          total_orders: 0,
          pending_orders: 0,
          completed_orders: 0,
          total_revenue: 0
        };
      }
      return response.json();
    },
  });

  const stats = statsData || {
    total_orders: 0,
    pending_orders: 0,
    completed_orders: 0,
    total_revenue: 0
  };

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Orders Hub</h1>
          <p className="text-muted-foreground">
            Manage existing orders or create new custom clothing orders
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="manage" className="flex items-center gap-2">
            <ClipboardList className="h-4 w-4" />
            Manage Orders
          </TabsTrigger>
          <TabsTrigger value="create" className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Create New Order
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.total_orders}</div>
                <p className="text-xs text-muted-foreground">
                  All time orders
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pending Orders</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.pending_orders}</div>
                <p className="text-xs text-muted-foreground">
                  Awaiting processing
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Completed</CardTitle>
                <ClipboardList className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.completed_orders}</div>
                <p className="text-xs text-muted-foreground">
                  Successfully fulfilled
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${stats.total_revenue?.toFixed(2) || '0.00'}</div>
                <p className="text-xs text-muted-foreground">
                  From completed orders
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer" 
                  onClick={() => setActiveTab('create')}>
              <CardHeader>
                <div className="flex items-center space-x-2">
                  <Plus className="h-6 w-6 text-primary" />
                  <div>
                    <CardTitle>Create New Order</CardTitle>
                    <CardDescription>
                      Start a new custom clothing order for a customer
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">
                    Add products, set pricing, and manage workflow
                  </div>
                  <Button size="sm">
                    Get Started
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow cursor-pointer" 
                  onClick={() => setActiveTab('manage')}>
              <CardHeader>
                <div className="flex items-center space-x-2">
                  <ClipboardList className="h-6 w-6 text-primary" />
                  <div>
                    <CardTitle>Manage Existing Orders</CardTitle>
                    <CardDescription>
                      View, edit, and track your current orders
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">
                    Update status, edit items, and communicate with customers
                  </div>
                  <Button size="sm" variant="outline">
                    View Orders
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quick Access Links */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Access</CardTitle>
              <CardDescription>
                Jump to frequently used features
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Link href="/product-library">
                  <Button variant="outline" className="w-full justify-start">
                    <Package className="mr-2 h-4 w-4" />
                    Product Library
                  </Button>
                </Link>
                <Link href="/customers">
                  <Button variant="outline" className="w-full justify-start">
                    <Users className="mr-2 h-4 w-4" />
                    Customers
                  </Button>
                </Link>
                <Link href="/design-tasks">
                  <Button variant="outline" className="w-full justify-start">
                    <Package className="mr-2 h-4 w-4" />
                    Design Tasks
                  </Button>
                </Link>
                <Link href="/production">
                  <Button variant="outline" className="w-full justify-start">
                    <Package className="mr-2 h-4 w-4" />
                    Production
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Manage Orders Tab */}
        <TabsContent value="manage">
          <OrderManagePage />
        </TabsContent>

        {/* Create Order Tab */}
        <TabsContent value="create">
          <OrderCreatePage />
        </TabsContent>
      </Tabs>
    </div>
  );
}