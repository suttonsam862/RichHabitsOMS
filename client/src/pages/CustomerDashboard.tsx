import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { Header } from "@/components/dashboard/Header";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  CardDescription,
  CardFooter
} from "@/components/ui/card";
import { getStatusColor, formatCurrency, formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  ShoppingBag, 
  FileText, 
  DollarSign, 
  Clock,
  Eye,
  Plus,
  MessageSquare
} from "lucide-react";
import { CustomerDashboardData, OrderSummary, MessageSummary } from "@/lib/types";

export default function CustomerDashboard() {
  const { requireAuth, user } = useAuth();
  const [, setLocation] = useLocation();

  // Check if user is authenticated with the right role
  useEffect(() => {
    requireAuth(["customer"]);
  }, [requireAuth]);

  // Fetch customer's orders and data
  const { data = {} as CustomerDashboardData, isLoading } = useQuery<CustomerDashboardData>({
    queryKey: ['/api/customer/dashboard'],
    enabled: !!user && user.role === 'customer',
  });

  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header title="Customer Dashboard" />
        
        <main className="flex-1 overflow-y-auto bg-gray-50 p-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900">My Dashboard</h1>
            <Button onClick={() => setLocation("/orders/new")}>
              <Plus className="mr-2 h-4 w-4" />
              New Order Request
            </Button>
          </div>
          
          {/* Order Statistics */}
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
                  <div className="p-2 bg-yellow-100 rounded-full">
                    <Clock className="h-6 w-6 text-yellow-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Pending Orders</p>
                    <h3 className="text-2xl font-bold">{isLoading ? '...' : data?.stats?.activeOrders || 0}</h3>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-4">
                  <div className="p-2 bg-green-100 rounded-full">
                    <DollarSign className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Total Spent</p>
                    <h3 className="text-2xl font-bold">{isLoading ? '...' : formatCurrency(data?.stats?.totalSpent || 0)}</h3>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Active Orders */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Active Orders</CardTitle>
              <CardDescription>Your currently active orders</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="py-4 text-center text-gray-500">Loading orders...</div>
              ) : data?.activeOrders?.length ? (
                <div className="space-y-4">
                  {data.activeOrders.map((order: OrderSummary) => (
                    <Card key={order.id} className="bg-white border hover:border-blue-200 transition-colors">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center space-x-2">
                              <h3 className="font-medium text-gray-900">Order #{order.orderNumber}</h3>
                              <Badge className={getStatusColor(order.status)}>
                                {order.status.replace(/_/g, ' ')}
                              </Badge>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4 mt-2">
                              <div className="text-xs text-gray-500">
                                <span className="font-medium">Date:</span> {formatDate(order.createdAt)}
                              </div>
                              <div className="text-xs text-gray-500">
                                <span className="font-medium">Total:</span> {formatCurrency(order.totalAmount)}
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex space-x-2">
                            {order.status === 'design_review' && (
                              <Button size="sm" variant="default" onClick={() => setLocation(`/orders/${order.id}`)}>
                                Review Design
                              </Button>
                            )}
                            
                            <Button size="sm" variant={order.status === 'design_review' ? 'outline' : 'default'} onClick={() => setLocation(`/orders/${order.id}`)}>
                              <Eye className="mr-2 h-4 w-4" />
                              View Details
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="py-10 text-center">
                  <ShoppingBag className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No active orders</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    You don't have any active orders at the moment.
                  </p>
                  <Button className="mt-4" onClick={() => setLocation("/orders/new")}>
                    <Plus className="mr-2 h-4 w-4" />
                    Create New Order
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* Recent Order History */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Order History</CardTitle>
              <CardDescription>Your previous orders</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="py-4 text-center text-gray-500">Loading history...</div>
              ) : data?.orderHistory?.length ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="py-3 px-4 text-left">Order #</th>
                        <th className="py-3 px-4 text-left">Date</th>
                        <th className="py-3 px-4 text-left">Items</th>
                        <th className="py-3 px-4 text-left">Total</th>
                        <th className="py-3 px-4 text-left">Status</th>
                        <th className="py-3 px-4 text-left">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.orderHistory.map((order: OrderSummary) => (
                        <tr key={order.id} className="border-b hover:bg-gray-50">
                          <td className="py-3 px-4">{order.orderNumber}</td>
                          <td className="py-3 px-4">{formatDate(order.createdAt)}</td>
                          <td className="py-3 px-4">{order.itemCount} items</td>
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
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="py-10 text-center">
                  <FileText className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No order history</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    You haven't placed any orders yet.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* Messages */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Messages</CardTitle>
              <CardDescription>Recent communications regarding your orders</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="py-4 text-center text-gray-500">Loading messages...</div>
              ) : data?.recentMessages?.length ? (
                <div className="space-y-4">
                  {data.recentMessages.map((message: MessageSummary) => (
                    <div key={message.id} className="flex items-start space-x-4 p-4 border-b last:border-0">
                      <div className="bg-primary text-primary-foreground h-9 w-9 rounded-full flex items-center justify-center flex-shrink-0">
                        {message.senderName ? message.senderName.charAt(0).toUpperCase() : 'U'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-gray-900">
                            {message.senderName || 'User'} 
                            {message.orderNumber && (
                              <span className="ml-2 text-xs text-gray-500">(Order #{message.orderNumber})</span>
                            )}
                          </p>
                          <span className="text-xs text-gray-500">{formatDate(message.createdAt)}</span>
                        </div>
                        <p className="text-sm text-gray-600 mt-1 line-clamp-2">{message.content}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-10 text-center">
                  <MessageSquare className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No messages</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    You don't have any recent messages.
                  </p>
                </div>
              )}
            </CardContent>
            <CardFooter className="bg-gray-50 border-t px-6 py-3">
              <Button variant="outline" className="w-full" onClick={() => setLocation("/messages")}>
                View All Messages
              </Button>
            </CardFooter>
          </Card>
        </main>
      </div>
    </div>
  );
}