import { useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { Header } from "@/components/dashboard/Header";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { getStatusColor, formatCurrency, formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Users, 
  ShoppingBag, 
  TrendingUp, 
  PlusCircle, 
  ClipboardList,
  DollarSign 
} from "lucide-react";

export default function SalespersonDashboard() {
  const { requireAuth, user } = useAuth();
  const [, setLocation] = useLocation();

  // Check if user is authenticated with the right role
  useEffect(() => {
    requireAuth(["salesperson"]);
  }, [requireAuth]);

  // Fetch dashboard data
  const { data, isLoading } = useQuery({
    queryKey: ['/api/salesperson/dashboard'],
    enabled: !!user && user.role === 'salesperson',
  });

  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header title="Salesperson Dashboard" />
        
        <main className="flex-1 overflow-y-auto bg-gray-50 p-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Salesperson Dashboard</h1>
            <Button onClick={() => setLocation("/orders/new")}>
              <PlusCircle className="mr-2 h-4 w-4" />
              New Order
            </Button>
          </div>
          
          {/* Key Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-4">
                  <div className="p-2 bg-blue-100 rounded-full">
                    <ShoppingBag className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Total Orders</p>
                    <h3 className="text-2xl font-bold">{isLoading ? '...' : data?.stats?.totalOrders || 0}</h3>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-4">
                  <div className="p-2 bg-green-100 rounded-full">
                    <Users className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Active Customers</p>
                    <h3 className="text-2xl font-bold">{isLoading ? '...' : data?.stats?.activeCustomers || 0}</h3>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-4">
                  <div className="p-2 bg-purple-100 rounded-full">
                    <DollarSign className="h-6 w-6 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Monthly Sales</p>
                    <h3 className="text-2xl font-bold">{isLoading ? '...' : formatCurrency(data?.stats?.monthlySales || 0)}</h3>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Recent Orders */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Recent Orders</span>
                <Button variant="outline" size="sm" onClick={() => setLocation("/orders")}>
                  View All
                </Button>
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
                      <th className="py-3 px-4 text-left">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {isLoading ? (
                      <tr>
                        <td colSpan={6} className="py-4 text-center text-gray-500">Loading...</td>
                      </tr>
                    ) : data?.recentOrders?.length ? (
                      data.recentOrders.map((order: any) => (
                        <tr key={order.id} className="border-b hover:bg-gray-50">
                          <td className="py-3 px-4">{order.orderNumber}</td>
                          <td className="py-3 px-4">{order.customerName}</td>
                          <td className="py-3 px-4">{formatDate(order.createdAt)}</td>
                          <td className="py-3 px-4">{formatCurrency(order.totalAmount)}</td>
                          <td className="py-3 px-4">
                            <Badge className={getStatusColor(order.status)}>
                              {order.status.replace(/_/g, ' ')}
                            </Badge>
                          </td>
                          <td className="py-3 px-4">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => setLocation(`/orders/${order.id}`)}
                            >
                              View
                            </Button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="py-4 text-center text-gray-500">No recent orders found</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
          
          {/* Tasks/Follow-ups */}
          <Card>
            <CardHeader>
              <CardTitle>Pending Tasks</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {isLoading ? (
                  <div className="py-4 text-center text-gray-500">Loading...</div>
                ) : data?.pendingTasks?.length ? (
                  data.pendingTasks.map((task: any) => (
                    <div 
                      key={task.id} 
                      className="p-4 border rounded-lg hover:bg-gray-50 flex items-center justify-between"
                    >
                      <div>
                        <h4 className="font-medium">{task.title}</h4>
                        <p className="text-sm text-gray-500">{task.description}</p>
                        <div className="flex items-center mt-1">
                          <span className="text-xs text-gray-500 flex items-center">
                            <ClipboardList className="h-3 w-3 mr-1" />
                            Order #{task.orderNumber}
                          </span>
                          <span className="mx-2 text-gray-300">•</span>
                          <span className="text-xs text-gray-500">Due: {formatDate(task.dueDate)}</span>
                        </div>
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => setLocation(`/orders/${task.orderId}`)}
                      >
                        View Order
                      </Button>
                    </div>
                  ))
                ) : (
                  <div className="py-4 text-center text-gray-500">No pending tasks found</div>
                )}
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
}