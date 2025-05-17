import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useEffect } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { OrderTable } from "@/components/orders/OrderTable";
import { formatCurrency } from "@/lib/utils";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { 
  ShoppingBag, 
  Brush, 
  Factory, 
  DollarSign, 
  Users, 
  CheckCircle,
  Clock 
} from "lucide-react";

// Colors for the charts
const COLORS = ['#4F46E5', '#0EA5E9', '#EC4899', '#F59E0B', '#10B981', '#6B7280'];

// Props for the dashboard
interface AdminDashboardProps {
  data: any;
  isLoading: boolean;
}

export default function AdminDashboard({ data, isLoading }: AdminDashboardProps) {
  const { requireAuth } = useAuth();
  const [, setLocation] = useLocation();

  // Require admin role
  useEffect(() => {
    const hasAccess = requireAuth(["admin"]);
    if (!hasAccess) {
      setLocation("/dashboard");
    }
  }, [requireAuth, setLocation]);

  // Fetch recent orders
  const { data: recentOrders, isLoading: ordersLoading } = useQuery({
    queryKey: ["/api/orders"],
  });

  if (isLoading || ordersLoading) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Admin Dashboard</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {Array(4).fill(0).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="h-16 animate-pulse bg-gray-200 rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="h-64 animate-pulse bg-gray-200 rounded"></div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Format data for order status chart
  const orderStatusData = data?.orderStats || [];
  
  // Example stat cards data
  const statCards = [
    {
      title: "Active Orders",
      value: orderStatusData.reduce((acc: number, stat: any) => 
        stat.status !== "completed" && stat.status !== "cancelled" ? acc + stat.count : acc, 0),
      icon: ShoppingBag,
      color: "bg-indigo-100 text-indigo-600"
    },
    {
      title: "Pending Designs",
      value: orderStatusData.find((s: any) => s.status === "pending_design")?.count || 0,
      icon: Brush,
      color: "bg-sky-100 text-sky-600"
    },
    {
      title: "In Production",
      value: orderStatusData.find((s: any) => s.status === "in_production")?.count || 0,
      icon: Factory,
      color: "bg-pink-100 text-pink-600"
    },
    {
      title: "Revenue (MTD)",
      value: formatCurrency(24500), // This would come from actual data
      icon: DollarSign,
      color: "bg-amber-100 text-amber-600"
    },
  ];

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="text-gray-600">Welcome back. Here's an overview of your clothing order management system.</p>
      </div>
      
      {/* Dashboard Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {statCards.map((card, index) => (
          <Card key={index}>
            <CardContent className="p-6">
              <div className="flex items-center space-x-3 mb-4">
                <div className={`p-2 ${card.color} rounded-lg`}>
                  <card.icon />
                </div>
                <h3 className="text-gray-500 font-medium">{card.title}</h3>
              </div>
              <div className="flex justify-between items-baseline">
                <p className="text-3xl font-bold">{card.value}</p>
                {index === 0 && (
                  <p className="text-sm text-green-600 flex items-center">
                    <span className="mr-1">↑</span> 12%
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      
      {/* Charts and Orders */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Order Status Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Order Status Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={orderStatusData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="count"
                    nameKey="status"
                    label={({ name, percent }) => `${name.replace('_', ' ')}: ${(percent * 100).toFixed(0)}%`}
                  >
                    {orderStatusData.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* User Roles Chart */}
        <Card>
          <CardHeader>
            <CardTitle>User Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={[
                    { name: 'Admin', count: data?.userCounts?.admin || 0 },
                    { name: 'Salesperson', count: data?.userCounts?.salesperson || 0 },
                    { name: 'Designer', count: data?.userCounts?.designer || 0 },
                    { name: 'Manufacturer', count: data?.userCounts?.manufacturer || 0 },
                    { name: 'Customer', count: data?.userCounts?.customer || 0 },
                  ]}
                  margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                >
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#4F46E5" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Recent Orders */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Recent Orders</CardTitle>
        </CardHeader>
        <CardContent>
          <OrderTable orders={recentOrders || []} />
        </CardContent>
      </Card>
      
      {/* Task Assignment Section */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Task Assignment</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Designer Assignment */}
            <div className="border border-gray-200 rounded-lg p-4">
              <h3 className="font-medium text-gray-900 mb-4">Designer Assignment</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium">#ORD-2023-1842</p>
                    <p className="text-sm text-gray-500">Custom T-shirt Design</p>
                  </div>
                  <select className="bg-white border border-gray-300 rounded-md px-3 py-1 text-sm">
                    <option>Select Designer</option>
                    <option>Alex Morgan</option>
                    <option>Priya Sharma</option>
                    <option>Juan Rodriguez</option>
                  </select>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium">#ORD-2023-1836</p>
                    <p className="text-sm text-gray-500">Embroidered Jacket</p>
                  </div>
                  <select className="bg-white border border-gray-300 rounded-md px-3 py-1 text-sm">
                    <option>Select Designer</option>
                    <option>Alex Morgan</option>
                    <option>Priya Sharma</option>
                    <option>Juan Rodriguez</option>
                  </select>
                </div>
              </div>
            </div>
            
            {/* Manufacturer Assignment */}
            <div className="border border-gray-200 rounded-lg p-4">
              <h3 className="font-medium text-gray-900 mb-4">Manufacturer Assignment</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium">#ORD-2023-1830</p>
                    <p className="text-sm text-gray-500">Corporate Uniforms (20 pcs)</p>
                  </div>
                  <select className="bg-white border border-gray-300 rounded-md px-3 py-1 text-sm">
                    <option>Select Manufacturer</option>
                    <option>Textile Masters Inc.</option>
                    <option>Fast Stitch Co.</option>
                    <option>Premium Apparel Ltd.</option>
                  </select>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium">#ORD-2023-1824</p>
                    <p className="text-sm text-gray-500">Custom Hoodies (8 pcs)</p>
                  </div>
                  <select className="bg-white border border-gray-300 rounded-md px-3 py-1 text-sm">
                    <option>Select Manufacturer</option>
                    <option>Textile Masters Inc.</option>
                    <option>Fast Stitch Co.</option>
                    <option>Premium Apparel Ltd.</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
