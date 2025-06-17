import { useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { Header } from "@/components/dashboard/Header";
import { useQuery } from "@tanstack/react-query";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { getStatusColor, formatCurrency } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from "recharts";
import { Users, Shirt, ShoppingBag, TrendingUp, DollarSign, ClipboardList, Crown } from "lucide-react";

// Rich Habits brand color palette for charts
const RICH_COLORS = ["#00d1ff", "#00ff9f", "#ffffff", "#666666", "#333333", "#1a1a1a"];

export default function AdminDashboard() {
  const { requireAuth, user } = useAuth();

  // Check if user is authenticated
  useEffect(() => {
    requireAuth(["admin"]);
  }, [requireAuth]);

  // Use existing dashboard endpoint
  const { data, isLoading } = useQuery({
    queryKey: ['/api/admin/dashboard'],
    enabled: !!user && user.role === 'admin',
  });

  return (
    <div className="flex h-screen bg-gradient-to-br from-rich-black via-gray-900 to-black">
      <Sidebar />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header title="Rich Habits Command Center" />
        
        <main className="flex-1 overflow-y-auto p-6 relative">
          {/* Rich Habits dashboard header */}
          <div className="rich-card p-6 mb-8">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 glass-panel neon-glow flex items-center justify-center">
                <Crown className="h-6 w-6 text-neon-blue" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-foreground">ADMIN COMMAND CENTER</h1>
                <p className="subtitle text-neon-green text-sm">Luxury Operations Dashboard</p>
              </div>
            </div>
          </div>
          
          {/* Rich Habits key stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="rich-card p-6">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 glass-panel neon-glow flex items-center justify-center">
                  <Users className="h-6 w-6 text-neon-blue" />
                </div>
                <div>
                  <p className="subtitle text-muted-foreground text-xs">Elite Members</p>
                  <h3 className="text-2xl font-bold text-foreground">{isLoading ? '...' : (data as any)?.stats?.totalUsers || 0}</h3>
                </div>
              </div>
            </div>
            
            <div className="rich-card p-6">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 glass-panel neon-glow-green flex items-center justify-center">
                  <ShoppingBag className="h-6 w-6 text-neon-green" />
                </div>
                <div>
                  <p className="subtitle text-muted-foreground text-xs">Active Orders</p>
                  <h3 className="text-2xl font-bold text-foreground">{isLoading ? '...' : (data as any)?.stats?.activeOrders || 0}</h3>
                </div>
              </div>
            </div>
            
            <div className="rich-card p-6">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 glass-panel neon-glow flex items-center justify-center">
                  <Shirt className="h-6 w-6 text-neon-blue" />
                </div>
                <div>
                  <p className="subtitle text-muted-foreground text-xs">Design Tasks</p>
                  <h3 className="text-2xl font-bold text-foreground">{isLoading ? '...' : (data as any)?.stats?.designTasks || 0}</h3>
                </div>
              </div>
            </div>
            
            <div className="rich-card p-6">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 glass-panel neon-glow-green flex items-center justify-center">
                  <DollarSign className="h-6 w-6 text-neon-green" />
                </div>
                <div>
                  <p className="subtitle text-muted-foreground text-xs">Total Revenue</p>
                  <h3 className="text-2xl font-bold text-foreground">{isLoading ? '...' : formatCurrency((data as any)?.stats?.totalRevenue || 0)}</h3>
                </div>
              </div>
            </div>
          </div>
          
          {/* Rich Habits Charts & Analytics */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <div className="rich-card p-6">
              <div className="mb-6">
                <h3 className="text-xl font-bold text-foreground mb-2">ORDER STATUS DISTRIBUTION</h3>
                <p className="subtitle text-neon-blue text-xs">Real-time order analytics</p>
              </div>
              <div className="h-80">
                {!isLoading && (data as any)?.ordersByStatus && (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={(data as any).ordersByStatus}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={80}
                        fill="#00d1ff"
                        dataKey="count"
                        nameKey="status"
                        label={({ name, percent }: any) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      >
                        {(data as any).ordersByStatus.map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={RICH_COLORS[index % RICH_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{
                          backgroundColor: 'rgba(10, 10, 10, 0.9)',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          borderRadius: '0px',
                          color: '#f5f5f5'
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
            
            <Card>
              <CardHeader>
                <CardTitle>Monthly Revenue</CardTitle>
                <CardDescription>Revenue trend over the last 6 months</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  {!isLoading && data?.monthlyRevenue && (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={data.monthlyRevenue}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis />
                        <Tooltip formatter={(value) => formatCurrency(value)} />
                        <Bar dataKey="revenue" fill="#3B82F6" />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Recent Orders */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Recent Orders</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="py-3 px-4 text-left">Order #</th>
                      <th className="py-3 px-4 text-left">Customer</th>
                      <th className="py-3 px-4 text-left">Date</th>
                      <th className="py-3 px-4 text-left">Amount</th>
                      <th className="py-3 px-4 text-left">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {isLoading ? (
                      <tr>
                        <td colSpan={5} className="py-4 text-center text-gray-500">Loading...</td>
                      </tr>
                    ) : data?.recentOrders?.length ? (
                      data.recentOrders.map((order: any) => (
                        <tr key={order.id} className="border-b hover:bg-gray-50">
                          <td className="py-3 px-4">{order.orderNumber}</td>
                          <td className="py-3 px-4">{order.customerName}</td>
                          <td className="py-3 px-4">{new Date(order.createdAt).toLocaleDateString()}</td>
                          <td className="py-3 px-4">{formatCurrency(order.totalAmount)}</td>
                          <td className="py-3 px-4">
                            <Badge className={getStatusColor(order.status)}>
                              {order.status.replace(/_/g, ' ')}
                            </Badge>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="py-4 text-center text-gray-500">No recent orders found</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
}