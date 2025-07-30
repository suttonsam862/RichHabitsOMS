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

  // Temporarily disable stats fetching to eliminate console spam
  // TODO: Re-enable once /api/stats/orders endpoint is properly registered
  const statsResponse = {
    success: true,
    data: {
      total_orders: 0,
      pending_orders: 0,
      completed_orders: 0,
      total_revenue: 0
    }
  };
  const loadingStats = false;

  // Extract stats from response or use fallback
  const stats = (statsResponse?.success && statsResponse?.data) ? statsResponse.data : {
    total_orders: 0,
    pending_orders: 0,
    completed_orders: 0,
    total_revenue: 0
  };

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Order Management Hub</h1>
          <p className="text-muted-foreground">
            Comprehensive order management system with creation, tracking, and workflow coordination
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/orders/enhanced">
            <Button variant="outline" size="sm">
              <ClipboardList className="mr-2 h-4 w-4" />
              Enhanced Orders
            </Button>
          </Link>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Dashboard Overview
          </TabsTrigger>
          <TabsTrigger value="manage" className="flex items-center gap-2">
            <ClipboardList className="h-4 w-4" />
            Order Management
          </TabsTrigger>
          <TabsTrigger value="create" className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Create Order
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
                      Start a new custom clothing order with integrated workflow
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">
                    Select products, set pricing, assign team members
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
                    <CardTitle>Order Management</CardTitle>
                    <CardDescription>
                      View, edit, and track orders through production workflow
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">
                    Update status, manage items, coordinate with teams
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
                Jump to frequently used features and related systems
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Link href="/catalog">
                  <Button variant="outline" className="w-full justify-start">
                    <Package className="mr-2 h-4 w-4" />
                    Catalog
                  </Button>
                </Link>
                <Link href="/customers">
                  <Button variant="outline" className="w-full justify-start">
                    <Users className="mr-2 h-4 w-4" />
                    Customers
                  </Button>
                </Link>
                <Link href="/orders/enhanced">
                  <Button variant="outline" className="w-full justify-start">
                    <ClipboardList className="mr-2 h-4 w-4" />
                    Enhanced Orders
                  </Button>
                </Link>
                <Link href="/manufacturing">
                  <Button variant="outline" className="w-full justify-start">
                    <Package className="mr-2 h-4 w-4" />
                    Manufacturing
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