import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertCircle, CalendarDays, DollarSign, ShoppingBag, Users } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8", "#FF6B6B"];

// Create empty data states instead of using placeholder data
const defaultMonthlyData = Array.from({ length: 6 }, (_, i) => {
  const date = new Date();
  date.setMonth(date.getMonth() - 5 + i);
  return {
    name: date.toLocaleString('default', { month: 'short' }),
    revenue: 0,
    orders: 0
  };
});

export default function AnalyticsPage() {
  const [timePeriod, setTimePeriod] = useState("30");

  // Fetch dashboard stats
  const { data: dashboardData, isLoading } = useQuery({
    queryKey: ['/api/dashboard/stats'],
    queryFn: async () => {
      try {
        const response = await apiRequest('GET', '/api/dashboard/stats');
        return response.json();
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
        return null;
      }
    }
  });

  // Process data for charts
  const monthlyData = dashboardData?.revenue?.monthlyRevenue || defaultMonthlyData;
  
  // Create order status data from real data
  const orderStatusData = dashboardData?.stats?.ordersByStatus
    ? Object.entries(dashboardData.stats.ordersByStatus).map(([status, count]) => ({
        name: status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
        value: count || 0
      }))
    : [];
    
  // Create empty order status data if none exists
  const emptyOrderStatusData = orderStatusData.length === 0 
    ? [
        { name: "No Data Available", value: 1 }
      ] 
    : orderStatusData;
  
  // Create item order data, or show empty state
  const inventoryData = dashboardData?.stats?.inventory || [];
  const topProducts = inventoryData.length > 0
    ? inventoryData.slice(0, 5).map((item: any) => ({
        name: item.name || "Unnamed Item",
        value: item.orderedQuantity || 0
      }))
    : [{ name: "No Product Data", value: 1 }];

  // Calculate totals from real data
  const totalRevenue = dashboardData?.stats?.totalRevenue || 0;
  const totalOrders = dashboardData?.stats?.totalOrders || 0;
  const totalCustomers = dashboardData?.stats?.customerCount || 0;
  const avgOrderValue = totalOrders > 0 ? (totalRevenue / totalOrders).toFixed(2) : 0;

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Analytics Dashboard</h1>
          <p className="text-muted-foreground mt-2">
            Monitor your business performance and trends
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <Select value={timePeriod} onValueChange={setTimePeriod}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select time period" />
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

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      ) : (
        <>
          {/* Key metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex flex-col space-y-1">
                    <span className="text-muted-foreground text-sm">Revenue</span>
                    <span className="text-2xl font-bold">${totalRevenue.toLocaleString()}</span>
                    <span className="text-xs text-muted-foreground">
                      Based on completed orders
                    </span>
                  </div>
                  <div className="p-2 bg-primary/20 rounded-full">
                    <DollarSign className="h-6 w-6 text-primary" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex flex-col space-y-1">
                    <span className="text-muted-foreground text-sm">Orders</span>
                    <span className="text-2xl font-bold">{totalOrders}</span>
                    <span className="text-xs text-muted-foreground">
                      Total number of orders
                    </span>
                  </div>
                  <div className="p-2 bg-primary/20 rounded-full">
                    <ShoppingBag className="h-6 w-6 text-primary" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex flex-col space-y-1">
                    <span className="text-muted-foreground text-sm">Customers</span>
                    <span className="text-2xl font-bold">{totalCustomers}</span>
                    <span className="text-xs text-muted-foreground">
                      Total registered customers
                    </span>
                  </div>
                  <div className="p-2 bg-primary/20 rounded-full">
                    <Users className="h-6 w-6 text-primary" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex flex-col space-y-1">
                    <span className="text-muted-foreground text-sm">Avg. Order Value</span>
                    <span className="text-2xl font-bold">${avgOrderValue}</span>
                    <span className="text-xs text-muted-foreground">
                      Per completed order
                    </span>
                  </div>
                  <div className="p-2 bg-primary/20 rounded-full">
                    <CalendarDays className="h-6 w-6 text-primary" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="revenue" className="space-y-6">
            <TabsList>
              <TabsTrigger value="revenue">Revenue</TabsTrigger>
              <TabsTrigger value="orders">Orders</TabsTrigger>
              <TabsTrigger value="products">Products</TabsTrigger>
            </TabsList>

            <TabsContent value="revenue" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Revenue Overview</CardTitle>
                  <CardDescription>Monthly revenue for the current year</CardDescription>
                </CardHeader>
                <CardContent>
                  {monthlyData.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-[300px] text-center border rounded-md">
                      <AlertCircle className="h-10 w-10 text-muted-foreground mb-4" />
                      <h3 className="text-lg font-medium mb-2">No Revenue Data Available</h3>
                      <p className="text-muted-foreground max-w-md mb-2">
                        There's no revenue data to display yet. Once you have completed orders with payments, they will appear here.
                      </p>
                    </div>
                  ) : (
                    <div className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={monthlyData}
                          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" />
                          <YAxis />
                          <Tooltip formatter={(value) => `$${value}`} />
                          <Legend />
                          <Bar dataKey="revenue" fill="#6366f1" name="Revenue ($)" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="orders" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Order Trends</CardTitle>
                    <CardDescription>Orders by month</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {monthlyData.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-[300px] text-center border rounded-md">
                        <AlertCircle className="h-10 w-10 text-muted-foreground mb-4" />
                        <h3 className="text-lg font-medium mb-2">No Order Data Available</h3>
                        <p className="text-muted-foreground max-w-md mb-2">
                          There's no order data to display yet. Once you have orders, they will appear here.
                        </p>
                      </div>
                    ) : (
                      <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            data={monthlyData}
                            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="orders" fill="#6366f1" name="Orders" />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Order Status</CardTitle>
                    <CardDescription>Distribution of orders by status</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[300px]">
                      {emptyOrderStatusData[0].name === "No Data Available" ? (
                        <div className="flex flex-col items-center justify-center h-full text-center">
                          <AlertCircle className="h-10 w-10 text-muted-foreground mb-4" />
                          <h3 className="text-lg font-medium mb-2">No Status Data Available</h3>
                          <p className="text-muted-foreground max-w-md mb-2">
                            There's no order status data to display yet.
                          </p>
                        </div>
                      ) : (
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={emptyOrderStatusData}
                              cx="50%"
                              cy="50%"
                              outerRadius={100}
                              fill="#8884d8"
                              dataKey="value"
                              label={({ name, percent }) => percent > 0.05 ? `${name} ${(percent * 100).toFixed(0)}%` : ''}
                            >
                              {emptyOrderStatusData.map((entry: any, index: number) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip formatter={(value) => [value, "Orders"]} />
                          </PieChart>
                        </ResponsiveContainer>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="products" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Top Products</CardTitle>
                  <CardDescription>Most popular products by order volume</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    {topProducts[0].name === "No Product Data" ? (
                      <div className="flex flex-col items-center justify-center h-full text-center">
                        <AlertCircle className="h-10 w-10 text-muted-foreground mb-4" />
                        <h3 className="text-lg font-medium mb-2">No Product Data Available</h3>
                        <p className="text-muted-foreground max-w-md mb-2">
                          There's no product data to display yet. Once you have orders with products, they will appear here.
                        </p>
                      </div>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={topProducts}
                            cx="50%"
                            cy="50%"
                            outerRadius={100}
                            fill="#8884d8"
                            dataKey="value"
                            label={({ name, percent }) => percent > 0.05 ? `${name} ${(percent * 100).toFixed(0)}%` : ''}
                          >
                            {topProducts.map((entry: any, index: number) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value) => [value, "Orders"]} />
                        </PieChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function AnalyticsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Analytics</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Order Analytics</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">Order performance metrics and trends.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Customer Analytics</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">Customer behavior and satisfaction metrics.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Production Analytics</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">Manufacturing efficiency and quality metrics.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
