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
        
        <main className="flex-1 overflow-y-auto p-6 relative bg-gradient-to-br from-rich-black via-gray-900 to-black">
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
            
            <div className="rich-card p-6">
              <div className="mb-6">
                <h3 className="text-xl font-bold text-foreground mb-2">REVENUE ANALYTICS</h3>
                <p className="subtitle text-neon-green text-xs">6-month performance metrics</p>
              </div>
              <div className="h-80">
                {!isLoading && (data as any)?.monthlyRevenue && (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={(data as any).monthlyRevenue}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                      <XAxis 
                        dataKey="month" 
                        tick={{ fill: '#f5f5f5', fontSize: 12 }}
                        axisLine={{ stroke: 'rgba(255,255,255,0.2)' }}
                      />
                      <YAxis 
                        tick={{ fill: '#f5f5f5', fontSize: 12 }}
                        axisLine={{ stroke: 'rgba(255,255,255,0.2)' }}
                      />
                      <Tooltip 
                        formatter={(value: any) => [formatCurrency(value), 'Revenue']}
                        contentStyle={{
                          backgroundColor: 'rgba(10, 10, 10, 0.9)',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          borderRadius: '0px',
                          color: '#f5f5f5'
                        }}
                      />
                      <Bar dataKey="revenue" fill="#00ff9f" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </div>
          
          {/* Rich Habits Recent Orders */}
          <div className="rich-card p-6">
            <div className="mb-6">
              <h3 className="text-xl font-bold text-foreground mb-2">RECENT ORDERS</h3>
              <p className="subtitle text-neon-blue text-xs">Latest luxury orders</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-glass-border">
                    <th className="py-4 px-4 text-left subtitle text-neon-blue text-xs">Order #</th>
                    <th className="py-4 px-4 text-left subtitle text-neon-blue text-xs">Customer</th>
                    <th className="py-4 px-4 text-left subtitle text-neon-blue text-xs">Date</th>
                    <th className="py-4 px-4 text-left subtitle text-neon-blue text-xs">Amount</th>
                    <th className="py-4 px-4 text-left subtitle text-neon-blue text-xs">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr>
                      <td colSpan={5} className="py-4 text-center text-muted-foreground">Loading...</td>
                    </tr>
                  ) : (data as any)?.recentOrders?.length ? (
                    (data as any).recentOrders.map((order: any) => (
                      <tr key={order.id} className="border-b border-glass-border/50 hover:bg-glass-panel/30 transition-colors">
                        <td className="py-4 px-4 text-foreground font-medium">{order.orderNumber}</td>
                        <td className="py-4 px-4 text-foreground">{order.customerName}</td>
                        <td className="py-4 px-4 text-muted-foreground">{new Date(order.createdAt).toLocaleDateString()}</td>
                        <td className="py-4 px-4 text-neon-green font-bold">{formatCurrency(order.totalAmount)}</td>
                        <td className="py-4 px-4">
                          <span className={`px-2 py-1 text-xs subtitle glass-panel neon-glow ${getStatusColor(order.status)}`}>
                            {order.status.replace(/_/g, ' ')}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-muted-foreground">No recent orders found</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}