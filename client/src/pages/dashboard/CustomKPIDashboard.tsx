/**
 * Custom KPI Dashboard
 * Real-time business metrics based on ThreadCraft internal data
 */

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Package,
  Users,
  Calendar,
  Target,
  Activity,
  Clock,
  CheckCircle,
  AlertCircle,
  BarChart3,
  PieChart as PieChartIcon,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { apiRequest } from '@/lib/queryClient';

const CHART_COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#FF6B6B'];

interface ThreadCraftKPIs {
  revenue: {
    total: number;
    monthly: number;
    growth: number;
    averageOrderValue: number;
    revenuePerCustomer: number;
    profitMargin: number;
  };
  orders: {
    total: number;
    pending: number;
    inProduction: number;
    completed: number;
    cancelled: number;
    conversionRate: number;
    averageLeadTime: number;
    onTimeDeliveryRate: number;
  };
  production: {
    designTasks: {
      total: number;
      pending: number;
      inProgress: number;
      completed: number;
      averageCompletionTime: number;
      approvalRate: number;
    };
    manufacturing: {
      activeTasks: number;
      completedTasks: number;
      averageProductionTime: number;
      qualityScore: number;
      capacityUtilization: number;
    };
  };
  customers: {
    total: number;
    active: number;
    newThisMonth: number;
    retentionRate: number;
    lifetimeValue: number;
    satisfactionScore: number;
  };
  catalog: {
    totalProducts: number;
    activeProducts: number;
    mockupsUploaded: number;
    popularCategories: Array<{ category: string; count: number }>;
    designerProductivity: Array<{ designer: string; mockups: number }>;
  };
}

export default function CustomKPIDashboard() {
  const [timeframe, setTimeframe] = useState('30');
  const [activeTab, setActiveTab] = useState('overview');

  // Fetch custom ThreadCraft KPIs
  const { data: kpiData, isLoading: kpiLoading, error: kpiError } = useQuery({
    queryKey: ['/api/kpis/threadcraft', timeframe],
    queryFn: async () => {
      try {
        const response = await apiRequest('GET', `/api/kpis/threadcraft?timeframe=${timeframe}`);
        return response.json();
      } catch (error) {
        console.error('Error fetching ThreadCraft KPIs:', error);
        return null;
      }
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Fetch revenue analytics
  const { data: revenueData, isLoading: revenueLoading } = useQuery({
    queryKey: ['/api/kpis/revenue', timeframe],
    queryFn: async () => {
      try {
        const response = await apiRequest('GET', `/api/kpis/revenue?timeframe=90`);
        return response.json();
      } catch (error) {
        console.error('Error fetching revenue analytics:', error);
        return null;
      }
    },
  });

  // Fetch production efficiency
  const { data: productionData, isLoading: productionLoading } = useQuery({
    queryKey: ['/api/kpis/production'],
    queryFn: async () => {
      try {
        const response = await apiRequest('GET', '/api/kpis/production');
        return response.json();
      } catch (error) {
        console.error('Error fetching production efficiency:', error);
        return null;
      }
    },
  });

  const kpis: ThreadCraftKPIs | null = kpiData?.success ? kpiData.data : null;
  const revenue = revenueData?.success ? revenueData.data : null;
  const production = productionData?.success ? productionData.data : null;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  const TrendIcon = ({ value }: { value: number }) => {
    return value >= 0 ? (
      <TrendingUp className="h-4 w-4 text-green-600" />
    ) : (
      <TrendingDown className="h-4 w-4 text-red-600" />
    );
  };

  if (kpiLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Custom KPI Dashboard</h1>
            <p className="text-muted-foreground">
              Real-time business metrics based on ThreadCraft internal data
            </p>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(8)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="h-4 w-20 bg-muted animate-pulse rounded" />
              </CardHeader>
              <CardContent>
                <div className="h-8 w-16 bg-muted animate-pulse rounded mb-2" />
                <div className="h-3 w-24 bg-muted animate-pulse rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (kpiError || !kpis) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-destructive" />
                Unable to Load KPIs
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                There was an error loading the custom KPI data. Please check your connection and try again.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Custom KPI Dashboard</h1>
          <p className="text-muted-foreground">
            Real-time business metrics based on ThreadCraft internal data
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Select value={timeframe} onValueChange={setTimeframe}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Select timeframe" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
              <SelectItem value="365">Last year</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="financial">Financial</TabsTrigger>
          <TabsTrigger value="operations">Operations</TabsTrigger>
          <TabsTrigger value="production">Production</TabsTrigger>
        </Tabs>

        <TabsContent value="overview" className="space-y-4">
          {/* Key Metrics Grid */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {/* Revenue */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(kpis.revenue.total)}</div>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <TrendIcon value={kpis.revenue.growth} />
                  {formatPercentage(Math.abs(kpis.revenue.growth))} from previous period
                </p>
              </CardContent>
            </Card>

            {/* Active Orders */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Orders</CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{kpis.orders.inProduction}</div>
                <p className="text-xs text-muted-foreground">
                  {kpis.orders.pending} pending, {kpis.orders.completed} completed
                </p>
              </CardContent>
            </Card>

            {/* Active Customers */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Customers</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{kpis.customers.active}</div>
                <p className="text-xs text-muted-foreground">
                  {formatPercentage(kpis.customers.retentionRate)} retention rate
                </p>
              </CardContent>
            </Card>

            {/* Production Efficiency */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Production Efficiency</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatPercentage(kpis.production.manufacturing.capacityUtilization)}
                </div>
                <p className="text-xs text-muted-foreground">
                  {kpis.production.manufacturing.activeTasks} active tasks
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Charts Row */}
          <div className="grid gap-4 md:grid-cols-2">
            {/* Order Status Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChartIcon className="h-5 w-5" />
                  Order Status Distribution
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Pending', value: kpis.orders.pending },
                        { name: 'In Production', value: kpis.orders.inProduction },
                        { name: 'Completed', value: kpis.orders.completed },
                        { name: 'Cancelled', value: kpis.orders.cancelled },
                      ]}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {[
                        { name: 'Pending', value: kpis.orders.pending },
                        { name: 'In Production', value: kpis.orders.inProduction },
                        { name: 'Completed', value: kpis.orders.completed },
                        { name: 'Cancelled', value: kpis.orders.cancelled },
                      ].map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Popular Categories */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Popular Product Categories
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={kpis.catalog.popularCategories}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="category" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#0088FE" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="financial" className="space-y-4">
          {/* Financial KPIs */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Average Order Value</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(kpis.revenue.averageOrderValue)}</div>
                <p className="text-xs text-muted-foreground">Per order</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Customer Lifetime Value</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(kpis.customers.lifetimeValue)}</div>
                <p className="text-xs text-muted-foreground">Per customer</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(kpis.revenue.monthly)}</div>
                <p className="text-xs text-muted-foreground">Last 30 days</p>
              </CardContent>
            </Card>
          </div>

          {/* Revenue Trend Chart */}
          {revenue?.monthlyTrend && (
            <Card>
              <CardHeader>
                <CardTitle>Revenue Trend</CardTitle>
                <CardDescription>Monthly revenue over time</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <AreaChart data={revenue.monthlyTrend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip formatter={(value: number) => [formatCurrency(value), 'Revenue']} />
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      stroke="#0088FE"
                      fill="#0088FE"
                      fillOpacity={0.3}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="operations" className="space-y-4">
          {/* Operational KPIs */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{kpis.orders.total}</div>
                <p className="text-xs text-muted-foreground">
                  {formatPercentage(kpis.orders.conversionRate)} conversion rate
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Average Lead Time</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{kpis.orders.averageLeadTime.toFixed(1)} days</div>
                <p className="text-xs text-muted-foreground">Order to completion</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">On-Time Delivery</CardTitle>
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatPercentage(kpis.orders.onTimeDeliveryRate)}</div>
                <p className="text-xs text-muted-foreground">Delivery performance</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Products</CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{kpis.catalog.activeProducts}</div>
                <p className="text-xs text-muted-foreground">
                  {kpis.catalog.mockupsUploaded} mockups uploaded
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Customer Metrics */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Customer Overview</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Total Customers</span>
                  <Badge variant="secondary">{kpis.customers.total}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Active Customers</span>
                  <Badge variant="secondary">{kpis.customers.active}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">New This Month</span>
                  <Badge variant="secondary">{kpis.customers.newThisMonth}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Retention Rate</span>
                  <Badge variant="secondary">{formatPercentage(kpis.customers.retentionRate)}</Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Performance Metrics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Customer Satisfaction</span>
                  <Badge variant="secondary">{kpis.customers.satisfactionScore}/5.0</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Avg. Lead Time</span>
                  <Badge variant="secondary">{kpis.orders.averageLeadTime.toFixed(1)} days</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Revenue Growth</span>
                  <Badge variant={kpis.revenue.growth >= 0 ? "default" : "destructive"}>
                    {formatPercentage(kpis.revenue.growth)}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="production" className="space-y-4">
          {/* Production KPIs */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Design Tasks</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{kpis.production.designTasks.total}</div>
                <p className="text-xs text-muted-foreground">
                  {kpis.production.designTasks.inProgress} in progress
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Design Completion</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {kpis.production.designTasks.averageCompletionTime.toFixed(1)} days
                </div>
                <p className="text-xs text-muted-foreground">Average completion time</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Production Tasks</CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{kpis.production.manufacturing.activeTasks}</div>
                <p className="text-xs text-muted-foreground">
                  {kpis.production.manufacturing.completedTasks} completed
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Quality Score</CardTitle>
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatPercentage(kpis.production.manufacturing.qualityScore)}
                </div>
                <p className="text-xs text-muted-foreground">Manufacturing quality</p>
              </CardContent>
            </Card>
          </div>

          {/* Production Efficiency Charts */}
          {production && (
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Design Task Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'Pending', value: kpis.production.designTasks.pending },
                          { name: 'In Progress', value: kpis.production.designTasks.inProgress },
                          { name: 'Completed', value: kpis.production.designTasks.completed },
                        ]}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {[
                          { name: 'Pending', value: kpis.production.designTasks.pending },
                          { name: 'In Progress', value: kpis.production.designTasks.inProgress },
                          { name: 'Completed', value: kpis.production.designTasks.completed },
                        ].map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Production Metrics</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Capacity Utilization</span>
                    <Badge variant="secondary">
                      {formatPercentage(kpis.production.manufacturing.capacityUtilization)}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Approval Rate</span>
                    <Badge variant="secondary">
                      {formatPercentage(kpis.production.designTasks.approvalRate)}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Avg. Production Time</span>
                    <Badge variant="secondary">
                      {kpis.production.manufacturing.averageProductionTime.toFixed(1)} days
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}