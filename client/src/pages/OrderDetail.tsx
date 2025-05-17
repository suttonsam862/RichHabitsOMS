import { useState, useEffect } from "react";
import { useLocation, useParams } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { Header } from "@/components/dashboard/Header";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency, formatDate, getStatusColor, getStatusLabel } from "@/lib/utils";
import MessageCenter from "@/components/messaging/MessageCenter";
import { FileUpload } from "@/components/design/FileUpload";
import { CheckoutForm } from "@/components/payments/CheckoutForm";

import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription, 
  CardFooter 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle 
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";

import { 
  ShoppingBag, 
  Brush, 
  Factory, 
  MessageSquare, 
  CreditCard,
  FileText,
  CheckCircle,
  DollarSign 
} from "lucide-react";

export default function OrderDetail() {
  const { id } = useParams();
  const { user, role, isAuthenticated, loading, requireAuth } = useAuth();
  const [, setLocation] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [messagesOpen, setMessagesOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Check if user is authenticated
  useEffect(() => {
    if (!loading) {
      requireAuth();
    }
  }, [isAuthenticated, loading, requireAuth]);

  // Fetch order details
  const { data: order, isLoading: orderLoading } = useQuery({
    queryKey: [`/api/orders/${id}`],
    enabled: isAuthenticated && !!id,
  });

  // Update order status mutation
  const updateOrderStatus = useMutation({
    mutationFn: async (status: string) => {
      return await apiRequest("PUT", `/api/orders/${id}`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/orders/${id}`] });
      toast({
        title: "Success",
        description: "Order status updated successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update order status",
        variant: "destructive",
      });
    }
  });

  // Handle design approval
  const handleDesignApproval = async () => {
    try {
      await updateOrderStatus.mutateAsync("design_approved");
      toast({
        title: "Design Approved",
        description: "The design has been approved for production",
      });
    } catch (error) {
      console.error("Error approving design:", error);
    }
  };

  // Show loading state
  if (loading || orderLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin h-10 w-10 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">Order Not Found</h1>
          <p className="text-gray-600 mt-2">The requested order does not exist or you don't have permission to view it.</p>
          <Button className="mt-4" onClick={() => setLocation("/orders")}>
            Back to Orders
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      <Sidebar mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />

      <div className="flex-1 flex flex-col md:ml-64">
        <Header 
          onOpenMessages={() => setMessagesOpen(true)} 
          onOpenNotifications={() => setNotificationsOpen(true)} 
        />

        <main className="flex-1 overflow-y-auto bg-gray-50 p-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
            <div>
              <div className="flex items-center space-x-3">
                <h1 className="text-2xl font-bold text-gray-900">
                  Order {order.orderNumber}
                </h1>
                <Badge className={getStatusColor(order.status)}>
                  {getStatusLabel(order.status)}
                </Badge>
              </div>
              <p className="text-gray-600 mt-1">
                Created on {formatDate(order.createdAt)}
              </p>
            </div>
            
            <div className="flex space-x-2 mt-4 md:mt-0">
              {/* Actions based on role and order status */}
              {role === "customer" && order.status === "design_review" && (
                <Button onClick={handleDesignApproval}>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Approve Design
                </Button>
              )}
              
              {role === "customer" && order.status === "draft" && (
                <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <DollarSign className="mr-2 h-4 w-4" />
                      Make Payment
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Complete Payment</DialogTitle>
                    </DialogHeader>
                    <CheckoutForm 
                      orderId={order.id} 
                      amount={parseFloat(order.totalAmount) + parseFloat(order.tax)} 
                      onSuccess={() => {
                        setPaymentDialogOpen(false);
                        queryClient.invalidateQueries({ queryKey: [`/api/orders/${id}`] });
                      }}
                    />
                  </DialogContent>
                </Dialog>
              )}
              
              {(role === "admin" || role === "salesperson") && (
                <Button variant="outline" onClick={() => setLocation(`/orders`)}>
                  Back to Orders
                </Button>
              )}
              
              <Button variant="outline" onClick={() => setMessagesOpen(true)}>
                <MessageSquare className="mr-2 h-4 w-4" />
                Messages
              </Button>
            </div>
          </div>
          
          <Tabs defaultValue="details">
            <TabsList className="mb-6">
              <TabsTrigger value="details">
                <ShoppingBag className="mr-2 h-4 w-4" />
                Order Details
              </TabsTrigger>
              <TabsTrigger value="design">
                <Brush className="mr-2 h-4 w-4" />
                Design
              </TabsTrigger>
              <TabsTrigger value="production">
                <Factory className="mr-2 h-4 w-4" />
                Production
              </TabsTrigger>
              <TabsTrigger value="payments">
                <CreditCard className="mr-2 h-4 w-4" />
                Payments
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="details">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Order Information */}
                <Card className="lg:col-span-2">
                  <CardHeader>
                    <CardTitle>Order Items</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Size</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Color</th>
                            <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                            <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                            <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {order.items && order.items.map((item: any) => (
                            <tr key={item.id}>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.productName}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.description}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.size}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.color}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">{item.quantity}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">{formatCurrency(item.unitPrice)}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">{formatCurrency(item.totalPrice)}</td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="bg-gray-50">
                            <td colSpan={6} className="px-6 py-3 text-right text-sm font-medium text-gray-500">Subtotal:</td>
                            <td className="px-6 py-3 text-right text-sm font-medium text-gray-900">{formatCurrency(order.totalAmount)}</td>
                          </tr>
                          <tr className="bg-gray-50">
                            <td colSpan={6} className="px-6 py-3 text-right text-sm font-medium text-gray-500">Tax (8%):</td>
                            <td className="px-6 py-3 text-right text-sm font-medium text-gray-900">{formatCurrency(order.tax)}</td>
                          </tr>
                          <tr className="bg-gray-50">
                            <td colSpan={6} className="px-6 py-3 text-right text-sm font-medium text-gray-900">Total:</td>
                            <td className="px-6 py-3 text-right text-sm font-bold text-gray-900">
                              {formatCurrency(parseFloat(order.totalAmount) + parseFloat(order.tax))}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </CardContent>
                </Card>
                
                {/* Order Summary */}
                <Card>
                  <CardHeader>
                    <CardTitle>Order Summary</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <h3 className="text-sm font-medium text-gray-500">Status</h3>
                        <Badge className={`mt-1 ${getStatusColor(order.status)}`}>
                          {getStatusLabel(order.status)}
                        </Badge>
                      </div>
                      
                      <div>
                        <h3 className="text-sm font-medium text-gray-500">Customer</h3>
                        <p className="text-gray-900">Sarah Johnson</p>
                        <p className="text-sm text-gray-500">sarah@example.com</p>
                      </div>
                      
                      <div>
                        <h3 className="text-sm font-medium text-gray-500">Salesperson</h3>
                        <p className="text-gray-900">John Smith</p>
                      </div>
                      
                      <div>
                        <h3 className="text-sm font-medium text-gray-500">Order Progress</h3>
                        <div className="mt-2">
                          <div className="relative">
                            <div className="overflow-hidden h-2 text-xs flex rounded bg-gray-200">
                              <div 
                                className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-blue-500"
                                style={{ width: "40%" }}
                              ></div>
                            </div>
                            <div className="flex justify-between text-xs text-gray-600 mt-1">
                              <span>Order Placed</span>
                              <span>Design</span>
                              <span>Production</span>
                              <span>Delivered</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div>
                        <h3 className="text-sm font-medium text-gray-500">Notes</h3>
                        <p className="text-sm text-gray-700">{order.notes || "No notes for this order."}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
            
            <TabsContent value="design">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Design Tasks */}
                <Card>
                  <CardHeader>
                    <CardTitle>Design Tasks</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {order.designTasks && order.designTasks.length > 0 ? (
                      <div className="space-y-4">
                        {order.designTasks.map((task: any) => (
                          <div key={task.id} className="border border-gray-200 rounded-lg p-4">
                            <div className="flex justify-between">
                              <div>
                                <h3 className="font-medium">{task.description || `Design Task #${task.id}`}</h3>
                                <div className="flex items-center mt-1">
                                  <Badge className={getStatusColor(task.status)}>
                                    {getStatusLabel(task.status)}
                                  </Badge>
                                  <span className="ml-2 text-sm text-gray-500">
                                    {task.dueDate ? `Due: ${formatDate(task.dueDate)}` : ""}
                                  </span>
                                </div>
                              </div>
                              {(role === "designer" || role === "admin") && (
                                <Button size="sm" variant="outline">
                                  Update Status
                                </Button>
                              )}
                            </div>
                            {task.notes && (
                              <div className="mt-3 p-3 bg-gray-50 rounded text-sm">
                                {task.notes}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <FileText className="mx-auto h-12 w-12 text-gray-400" />
                        <h3 className="mt-2 text-sm font-medium text-gray-900">No design tasks</h3>
                        <p className="mt-1 text-sm text-gray-500">
                          No design tasks have been created for this order yet.
                        </p>
                        {role === "admin" && (
                          <div className="mt-6">
                            <Button>Create Design Task</Button>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
                
                {/* Design Files */}
                <Card>
                  <CardHeader>
                    <div className="flex justify-between items-center">
                      <CardTitle>Design Files</CardTitle>
                      {(role === "designer" || role === "admin") && order.designTasks && order.designTasks.length > 0 && (
                        <FileUpload 
                          designTaskId={order.designTasks[0].id} 
                          onSuccess={() => {
                            queryClient.invalidateQueries({ queryKey: [`/api/orders/${id}`] });
                            toast({
                              title: "File Uploaded",
                              description: "Design file has been uploaded successfully",
                            });
                          }}
                        />
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {/* This would map through actual design files */}
                      <div className="flex items-center p-3 bg-gray-50 rounded-lg border border-gray-200">
                        <FileText className="h-5 w-5 text-gray-400 mr-2" />
                        <span className="text-sm text-gray-600">t-shirt-front-design-v1.ai</span>
                        <div className="ml-auto flex space-x-2">
                          <Button size="sm" variant="ghost">
                            View
                          </Button>
                          {(role === "designer" || role === "admin") && (
                            <Button size="sm" variant="ghost" className="text-red-600 hover:text-red-700">
                              Delete
                            </Button>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center p-3 bg-gray-50 rounded-lg border border-gray-200">
                        <FileText className="h-5 w-5 text-gray-400 mr-2" />
                        <span className="text-sm text-gray-600">color-variations.pdf</span>
                        <div className="ml-auto flex space-x-2">
                          <Button size="sm" variant="ghost">
                            View
                          </Button>
                          {(role === "designer" || role === "admin") && (
                            <Button size="sm" variant="ghost" className="text-red-600 hover:text-red-700">
                              Delete
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
            
            <TabsContent value="production">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Production Tasks */}
                <Card>
                  <CardHeader>
                    <CardTitle>Production Tasks</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {order.productionTasks && order.productionTasks.length > 0 ? (
                      <div className="space-y-4">
                        {order.productionTasks.map((task: any) => (
                          <div key={task.id} className="border border-gray-200 rounded-lg p-4">
                            <div className="flex justify-between">
                              <div>
                                <h3 className="font-medium">{task.description || `Production Task #${task.id}`}</h3>
                                <div className="flex items-center mt-1">
                                  <Badge className={getStatusColor(task.status)}>
                                    {getStatusLabel(task.status)}
                                  </Badge>
                                  <span className="ml-2 text-sm text-gray-500">
                                    {task.dueDate ? `Due: ${formatDate(task.dueDate)}` : ""}
                                  </span>
                                </div>
                              </div>
                              {(role === "manufacturer" || role === "admin") && (
                                <Button size="sm" variant="outline">
                                  Update Status
                                </Button>
                              )}
                            </div>
                            {task.notes && (
                              <div className="mt-3 p-3 bg-gray-50 rounded text-sm">
                                {task.notes}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <Factory className="mx-auto h-12 w-12 text-gray-400" />
                        <h3 className="mt-2 text-sm font-medium text-gray-900">No production tasks</h3>
                        <p className="mt-1 text-sm text-gray-500">
                          No production tasks have been created for this order yet.
                        </p>
                        {role === "admin" && (
                          <div className="mt-6">
                            <Button>Create Production Task</Button>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
                
                {/* Production Timeline */}
                <Card>
                  <CardHeader>
                    <CardTitle>Production Timeline</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="p-4 border rounded-lg">
                      <ol className="relative border-l border-gray-200 ml-3">
                        <li className="mb-6 ml-6">
                          <span className="absolute flex items-center justify-center w-6 h-6 bg-green-100 rounded-full -left-3 ring-8 ring-white">
                            <CheckCircle className="h-3 w-3 text-green-500" />
                          </span>
                          <div className="flex items-center justify-between">
                            <h3 className="text-sm font-medium text-gray-900">Order Received</h3>
                            <time className="text-xs text-gray-500">{formatDate(order.createdAt)}</time>
                          </div>
                          <p className="text-sm text-gray-500 mt-1">Order has been placed and payment received</p>
                        </li>
                        
                        <li className="mb-6 ml-6">
                          <span className={`absolute flex items-center justify-center w-6 h-6 ${order.status === 'design_in_progress' || order.status === 'design_approved' ? 'bg-green-100' : 'bg-gray-100'} rounded-full -left-3 ring-8 ring-white`}>
                            {order.status === 'design_in_progress' || order.status === 'design_approved' ? (
                              <CheckCircle className="h-3 w-3 text-green-500" />
                            ) : (
                              <div className="h-3 w-3 rounded-full bg-gray-400" />
                            )}
                          </span>
                          <div className="flex items-center justify-between">
                            <h3 className="text-sm font-medium text-gray-900">Design Completed</h3>
                            <time className="text-xs text-gray-500">
                              {order.status === 'design_in_progress' || order.status === 'design_approved' ? 
                                formatDate(new Date()) : "Pending"}
                            </time>
                          </div>
                          <p className="text-sm text-gray-500 mt-1">Design has been created and approved</p>
                        </li>
                        
                        <li className="mb-6 ml-6">
                          <span className={`absolute flex items-center justify-center w-6 h-6 ${order.status === 'in_production' ? 'bg-blue-100' : 'bg-gray-100'} rounded-full -left-3 ring-8 ring-white`}>
                            {order.status === 'in_production' ? (
                              <Factory className="h-3 w-3 text-blue-500" />
                            ) : (
                              <div className="h-3 w-3 rounded-full bg-gray-400" />
                            )}
                          </span>
                          <div className="flex items-center justify-between">
                            <h3 className="text-sm font-medium text-gray-900">Production In Progress</h3>
                            <time className="text-xs text-gray-500">
                              {order.status === 'in_production' ? formatDate(new Date()) : "Pending"}
                            </time>
                          </div>
                          <p className="text-sm text-gray-500 mt-1">Items are being manufactured</p>
                        </li>
                        
                        <li className="ml-6">
                          <span className={`absolute flex items-center justify-center w-6 h-6 ${order.status === 'completed' ? 'bg-green-100' : 'bg-gray-100'} rounded-full -left-3 ring-8 ring-white`}>
                            {order.status === 'completed' ? (
                              <CheckCircle className="h-3 w-3 text-green-500" />
                            ) : (
                              <div className="h-3 w-3 rounded-full bg-gray-400" />
                            )}
                          </span>
                          <div className="flex items-center justify-between">
                            <h3 className="text-sm font-medium text-gray-900">Order Completed</h3>
                            <time className="text-xs text-gray-500">
                              {order.status === 'completed' ? formatDate(new Date()) : "Pending"}
                            </time>
                          </div>
                          <p className="text-sm text-gray-500 mt-1">All items manufactured and ready for delivery</p>
                        </li>
                      </ol>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
            
            <TabsContent value="payments">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Payments */}
                <Card>
                  <CardHeader>
                    <CardTitle>Payment History</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                            <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          <tr>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatDate(order.createdAt)}</td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200">
                                Paid
                              </Badge>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                              {formatCurrency(parseFloat(order.totalAmount) + parseFloat(order.tax))}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
                
                {/* Invoice */}
                <Card>
                  <CardHeader>
                    <CardTitle>Invoice</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="border border-gray-200 rounded-lg p-6">
                      <div className="flex justify-between items-start">
                        <div>
                          <h2 className="text-xl font-bold">INVOICE</h2>
                          <p className="text-sm text-gray-500 mt-1">Invoice #INV-2023-{order.id}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold">ThreadCraft Inc.</p>
                          <p className="text-sm text-gray-500">123 Stitch Street</p>
                          <p className="text-sm text-gray-500">New York, NY 10001</p>
                        </div>
                      </div>
                      
                      <div className="mt-8 flex justify-between">
                        <div>
                          <h3 className="font-medium text-gray-900">Bill To:</h3>
                          <p className="text-sm text-gray-600 mt-1">Sarah Johnson</p>
                          <p className="text-sm text-gray-600">sarah@example.com</p>
                          <p className="text-sm text-gray-600">123 Customer Lane</p>
                          <p className="text-sm text-gray-600">Customer City, CC 10002</p>
                        </div>
                        <div>
                          <div className="text-right">
                            <h3 className="font-medium text-gray-900">Invoice Details:</h3>
                            <p className="text-sm text-gray-600 mt-1">
                              <span className="font-medium">Date:</span> {formatDate(order.createdAt)}
                            </p>
                            <p className="text-sm text-gray-600">
                              <span className="font-medium">Order Number:</span> {order.orderNumber}
                            </p>
                            <p className="text-sm text-gray-600">
                              <span className="font-medium">Payment Status:</span> Paid
                            </p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="mt-8">
                        <h3 className="font-medium text-gray-900 mb-2">Order Summary:</h3>
                        <div className="border-t border-gray-200 pt-4">
                          <div className="flex justify-between py-2">
                            <span className="text-gray-600">Subtotal:</span>
                            <span>{formatCurrency(order.totalAmount)}</span>
                          </div>
                          <div className="flex justify-between py-2">
                            <span className="text-gray-600">Tax (8%):</span>
                            <span>{formatCurrency(order.tax)}</span>
                          </div>
                          <div className="flex justify-between py-2 font-bold border-t border-gray-200 mt-2 pt-2">
                            <span>Total:</span>
                            <span>{formatCurrency(parseFloat(order.totalAmount) + parseFloat(order.tax))}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="mt-8 text-center">
                        <p className="text-sm text-gray-500">Thank you for your business!</p>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="flex justify-end">
                    <Button variant="outline">
                      Download Invoice
                    </Button>
                  </CardFooter>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </main>
      </div>

      {/* Messages Slide-out Panel */}
      <Sheet open={messagesOpen} onOpenChange={setMessagesOpen}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader className="mb-4">
            <SheetTitle>Messages</SheetTitle>
          </SheetHeader>
          <MessageCenter orderId={parseInt(id)} />
        </SheetContent>
      </Sheet>

      {/* Notifications Slide-out Panel */}
      <Sheet open={notificationsOpen} onOpenChange={setNotificationsOpen}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader className="mb-4">
            <SheetTitle>Notifications</SheetTitle>
          </SheetHeader>
          <div className="space-y-4">
            {/* Notification content would go here */}
            <p className="text-gray-500 text-center py-8">
              No notifications at this time
            </p>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
