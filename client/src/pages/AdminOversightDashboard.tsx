import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { Header } from "@/components/dashboard/Header";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency, formatDate, getStatusColor } from "@/lib/utils";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  AlertCircle, 
  CheckCircle, 
  DollarSign, 
  Filter, 
  FileText,
  Layers,
  Shirt, 
  ShoppingBag, 
  Users, 
  UserCircle,
  RefreshCw,
  Search
} from "lucide-react";

export default function AdminOversightDashboard() {
  const { requireAuth, user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Dashboard states
  const [selectedTab, setSelectedTab] = useState("summary");
  const [statusFilter, setStatusFilter] = useState("all");
  const [salesPersonFilter, setSalesPersonFilter] = useState("all");
  const [manufacturerFilter, setManufacturerFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [assignManufacturerDialogOpen, setAssignManufacturerDialogOpen] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [selectedManufacturerId, setSelectedManufacturerId] = useState<number | null>(null);

  // Check if user is authenticated
  useEffect(() => {
    requireAuth(["admin"]);
  }, [requireAuth]);

  // Fetch dashboard data
  const { data: dashboardData, isLoading: isDashboardLoading } = useQuery({
    queryKey: ['/api/dashboard/stats'],
    enabled: !!user && user.role === 'admin',
  });

  // Fetch orders for management view
  const { data: ordersData, isLoading: isOrdersLoading } = useQuery({
    queryKey: ['/api/orders', statusFilter, salesPersonFilter, manufacturerFilter, searchTerm],
    queryFn: async () => {
      let url = '/api/orders?';
      if (statusFilter !== 'all') url += `status=${statusFilter}&`;
      if (salesPersonFilter !== 'all') url += `salespersonId=${salesPersonFilter}&`;
      if (manufacturerFilter !== 'all') url += `manufacturerId=${manufacturerFilter}&`;
      if (searchTerm) url += `search=${encodeURIComponent(searchTerm)}&`;
      return (await apiRequest('GET', url)).json();
    },
    enabled: !!user && user.role === 'admin' && selectedTab === 'orders',
  });

  // Fetch users by role for filters and assignment
  const { data: salesPersons, isLoading: isSalesPersonsLoading } = useQuery({
    queryKey: ['/api/users', 'salesperson'],
    queryFn: async () => (await apiRequest('GET', '/api/users?role=salesperson')).json(),
    enabled: !!user && user.role === 'admin',
  });

  const { data: manufacturers, isLoading: isManufacturersLoading } = useQuery({
    queryKey: ['/api/users', 'manufacturer'],
    queryFn: async () => (await apiRequest('GET', '/api/users?role=manufacturer')).json(),
    enabled: !!user && user.role === 'admin',
  });

  // Mutations for admin actions
  const assignManufacturerMutation = useMutation({
    mutationFn: async ({orderId, manufacturerId}: {orderId: number, manufacturerId: number}) => {
      const response = await apiRequest('PATCH', `/api/orders/${orderId}/assign-manufacturer`, {
        manufacturerId
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Manufacturer Assigned",
        description: "The manufacturer has been successfully assigned to this order.",
      });
      queryClient.invalidateQueries({queryKey: ['/api/orders']});
      setAssignManufacturerDialogOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to assign manufacturer",
        variant: "destructive",
      });
    }
  });

  const approveDesignMutation = useMutation({
    mutationFn: async (taskId: number) => {
      const response = await apiRequest('PATCH', `/api/design-tasks/${taskId}/approve`, {});
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Design Approved",
        description: "The design has been successfully approved.",
      });
      queryClient.invalidateQueries({queryKey: ['/api/orders']});
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to approve design",
        variant: "destructive",
      });
    }
  });

  const markAsPaidMutation = useMutation({
    mutationFn: async (orderId: number) => {
      const response = await apiRequest('PATCH', `/api/orders/${orderId}/mark-paid`, {});
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Order Marked as Paid",
        description: "The order has been successfully marked as paid.",
      });
      queryClient.invalidateQueries({queryKey: ['/api/orders']});
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to mark order as paid",
        variant: "destructive",
      });
    }
  });

  // Function to handle assigning manufacturer
  const handleAssignManufacturer = (orderId: number) => {
    setSelectedOrderId(orderId);
    setSelectedManufacturerId(null);
    setAssignManufacturerDialogOpen(true);
  };

  // Function to confirm manufacturer assignment
  const confirmAssignManufacturer = () => {
    if (selectedOrderId && selectedManufacturerId) {
      assignManufacturerMutation.mutate({
        orderId: selectedOrderId,
        manufacturerId: selectedManufacturerId
      });
    }
  };

  // Function to handle design approval
  const handleApproveDesign = (taskId: number) => {
    approveDesignMutation.mutate(taskId);
  };

  // Function to handle marking order as paid
  const handleMarkAsPaid = (orderId: number) => {
    markAsPaidMutation.mutate(orderId);
  };

  // Function to check if an order needs admin attention
  const needsAttention = (order: any) => {
    return (
      (order.status === 'design_review' && !order.designTasks?.some((t: any) => t.status === 'approved')) ||
      (order.status === 'pending_production' && !order.manufacturerId) ||
      (order.status !== 'draft' && !order.isPaid)
    );
  };

  // Calculate summary metrics
  const summaryMetrics = {
    totalOrders: ordersData?.length || 0,
    ordersByStatus: {
      pendingDesign: ordersData?.filter((o: any) => o.status === 'pending_design').length || 0,
      inProduction: ordersData?.filter((o: any) => o.status === 'in_production').length || 0,
      completed: ordersData?.filter((o: any) => o.status === 'completed').length || 0,
      paid: ordersData?.filter((o: any) => o.isPaid).length || 0,
    },
    usersByRole: dashboardData?.userCounts || {},
    unassignedTasks: {
      design: ordersData?.filter((o: any) => 
        o.status === 'pending_design' && 
        o.designTasks?.every((t: any) => !t.designerId)
      ).length || 0,
      manufacturing: ordersData?.filter((o: any) => 
        o.status === 'pending_production' && 
        !o.manufacturerId
      ).length || 0
    }
  };

  return (
    <div className="min-h-screen flex">
      <Sidebar />
      
      <div className="flex-1 flex flex-col md:ml-64">
        <Header />
        
        <main className="flex-1 overflow-y-auto bg-gray-50 p-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Admin Oversight Dashboard</h1>
          </div>
          
          <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-4">
            <TabsList>
              <TabsTrigger value="summary">
                <Layers className="mr-2 h-4 w-4" />
                Summary
              </TabsTrigger>
              <TabsTrigger value="orders">
                <ShoppingBag className="mr-2 h-4 w-4" />
                Orders Management
              </TabsTrigger>
              <TabsTrigger value="errors" disabled>
                <AlertCircle className="mr-2 h-4 w-4" />
                Errors & Logs
              </TabsTrigger>
            </TabsList>
            
            {/* Summary Tab Content */}
            <TabsContent value="summary" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-6 flex flex-col items-center">
                    <div className="p-3 bg-blue-100 rounded-full mb-4">
                      <ShoppingBag className="h-8 w-8 text-blue-600" />
                    </div>
                    <h3 className="text-3xl font-bold text-center">{summaryMetrics.totalOrders}</h3>
                    <p className="text-sm text-center text-gray-500">Total Orders</p>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-6 flex flex-col items-center">
                    <div className="p-3 bg-green-100 rounded-full mb-4">
                      <DollarSign className="h-8 w-8 text-green-600" />
                    </div>
                    <h3 className="text-3xl font-bold text-center">{summaryMetrics.ordersByStatus.paid}</h3>
                    <p className="text-sm text-center text-gray-500">Paid Orders</p>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-6 flex flex-col items-center">
                    <div className="p-3 bg-yellow-100 rounded-full mb-4">
                      <Users className="h-8 w-8 text-yellow-600" />
                    </div>
                    <h3 className="text-3xl font-bold text-center">
                      {Object.values(summaryMetrics.usersByRole).reduce((a: number, b: number) => a + b, 0)}
                    </h3>
                    <p className="text-sm text-center text-gray-500">Total Users</p>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-6 flex flex-col items-center">
                    <div className="p-3 bg-red-100 rounded-full mb-4">
                      <AlertCircle className="h-8 w-8 text-red-600" />
                    </div>
                    <h3 className="text-3xl font-bold text-center">
                      {summaryMetrics.unassignedTasks.design + summaryMetrics.unassignedTasks.manufacturing}
                    </h3>
                    <p className="text-sm text-center text-gray-500">Unassigned Tasks</p>
                  </CardContent>
                </Card>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Orders by Status</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center">
                          <span className="w-3 h-3 rounded-full bg-blue-500 mr-2"></span>
                          <span>Pending Design</span>
                        </div>
                        <Badge variant="outline">{summaryMetrics.ordersByStatus.pendingDesign}</Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <div className="flex items-center">
                          <span className="w-3 h-3 rounded-full bg-yellow-500 mr-2"></span>
                          <span>In Production</span>
                        </div>
                        <Badge variant="outline">{summaryMetrics.ordersByStatus.inProduction}</Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <div className="flex items-center">
                          <span className="w-3 h-3 rounded-full bg-green-500 mr-2"></span>
                          <span>Completed</span>
                        </div>
                        <Badge variant="outline">{summaryMetrics.ordersByStatus.completed}</Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <div className="flex items-center">
                          <span className="w-3 h-3 rounded-full bg-purple-500 mr-2"></span>
                          <span>Paid</span>
                        </div>
                        <Badge variant="outline">{summaryMetrics.ordersByStatus.paid}</Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle>Users by Role</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center">
                          <span className="w-3 h-3 rounded-full bg-gray-800 mr-2"></span>
                          <span>Administrators</span>
                        </div>
                        <Badge variant="outline">{summaryMetrics.usersByRole.admin || 0}</Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <div className="flex items-center">
                          <span className="w-3 h-3 rounded-full bg-blue-500 mr-2"></span>
                          <span>Salespeople</span>
                        </div>
                        <Badge variant="outline">{summaryMetrics.usersByRole.salesperson || 0}</Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <div className="flex items-center">
                          <span className="w-3 h-3 rounded-full bg-green-500 mr-2"></span>
                          <span>Designers</span>
                        </div>
                        <Badge variant="outline">{summaryMetrics.usersByRole.designer || 0}</Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <div className="flex items-center">
                          <span className="w-3 h-3 rounded-full bg-yellow-500 mr-2"></span>
                          <span>Manufacturers</span>
                        </div>
                        <Badge variant="outline">{summaryMetrics.usersByRole.manufacturer || 0}</Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <div className="flex items-center">
                          <span className="w-3 h-3 rounded-full bg-purple-500 mr-2"></span>
                          <span>Customers</span>
                        </div>
                        <Badge variant="outline">{summaryMetrics.usersByRole.customer || 0}</Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
              
              <Card>
                <CardHeader>
                  <CardTitle>Items Needing Attention</CardTitle>
                  <CardDescription>Orders and tasks that require administrative action</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center p-2 bg-yellow-50 rounded-md">
                      <div className="flex items-center">
                        <AlertCircle className="text-yellow-500 mr-2 h-5 w-5" />
                        <span>Design Tasks Awaiting Approval</span>
                      </div>
                      <Badge variant="outline" className="bg-yellow-100">
                        {ordersData?.filter((o: any) => 
                          o.status === 'design_review' && 
                          o.designTasks?.some((t: any) => t.status === 'submitted')
                        ).length || 0}
                      </Badge>
                    </div>
                    
                    <div className="flex justify-between items-center p-2 bg-blue-50 rounded-md">
                      <div className="flex items-center">
                        <UserCircle className="text-blue-500 mr-2 h-5 w-5" />
                        <span>Orders Awaiting Manufacturer Assignment</span>
                      </div>
                      <Badge variant="outline" className="bg-blue-100">
                        {summaryMetrics.unassignedTasks.manufacturing}
                      </Badge>
                    </div>
                    
                    <div className="flex justify-between items-center p-2 bg-green-50 rounded-md">
                      <div className="flex items-center">
                        <DollarSign className="text-green-500 mr-2 h-5 w-5" />
                        <span>Orders Awaiting Payment</span>
                      </div>
                      <Badge variant="outline" className="bg-green-100">
                        {ordersData?.filter((o: any) => !o.isPaid && o.status !== 'draft').length || 0}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            {/* Orders Management Tab Content */}
            <TabsContent value="orders" className="space-y-4">
              <Card>
                <CardHeader>
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <CardTitle>Orders Management</CardTitle>
                    <div className="flex flex-wrap gap-2">
                      <div className="flex items-center space-x-2">
                        <Search className="h-4 w-4 text-gray-500" />
                        <Input
                          placeholder="Search orders..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="w-full md:w-auto"
                        />
                      </div>
                      
                      <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="w-full md:w-[180px]">
                          <SelectValue placeholder="Filter by status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Statuses</SelectItem>
                          <SelectItem value="draft">Draft</SelectItem>
                          <SelectItem value="pending_design">Pending Design</SelectItem>
                          <SelectItem value="design_in_progress">Design in Progress</SelectItem>
                          <SelectItem value="design_review">Design Review</SelectItem>
                          <SelectItem value="design_approved">Design Approved</SelectItem>
                          <SelectItem value="pending_production">Pending Production</SelectItem>
                          <SelectItem value="in_production">In Production</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                          <SelectItem value="cancelled">Cancelled</SelectItem>
                        </SelectContent>
                      </Select>
                      
                      <Select value={salesPersonFilter} onValueChange={setSalesPersonFilter}>
                        <SelectTrigger className="w-full md:w-[180px]">
                          <SelectValue placeholder="Filter by salesperson" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Salespeople</SelectItem>
                          {!isSalesPersonsLoading && salesPersons?.map((sp: any) => (
                            <SelectItem key={sp.id} value={sp.id.toString()}>
                              {sp.firstName} {sp.lastName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      
                      <Select value={manufacturerFilter} onValueChange={setManufacturerFilter}>
                        <SelectTrigger className="w-full md:w-[180px]">
                          <SelectValue placeholder="Filter by manufacturer" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Manufacturers</SelectItem>
                          <SelectItem value="unassigned">Unassigned</SelectItem>
                          {!isManufacturersLoading && manufacturers?.map((m: any) => (
                            <SelectItem key={m.id} value={m.id.toString()}>
                              {m.firstName} {m.lastName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      
                      <Button variant="outline" onClick={() => {
                        setStatusFilter("all");
                        setSalesPersonFilter("all");
                        setManufacturerFilter("all");
                        setSearchTerm("");
                      }}>
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Reset
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {isOrdersLoading ? (
                    <div className="flex justify-center items-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                  ) : ordersData?.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      No orders found matching your filters
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-[80px]">ID</TableHead>
                            <TableHead>Order Number</TableHead>
                            <TableHead>Customer</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Salesperson</TableHead>
                            <TableHead>Manufacturer</TableHead>
                            <TableHead>Amount</TableHead>
                            <TableHead>Paid</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {ordersData?.map((order: any) => (
                            <TableRow key={order.id} className={needsAttention(order) ? "bg-yellow-50" : ""}>
                              <TableCell>{order.id}</TableCell>
                              <TableCell>{order.orderNumber}</TableCell>
                              <TableCell>{order.customerName}</TableCell>
                              <TableCell>{formatDate(order.createdAt)}</TableCell>
                              <TableCell>
                                <Badge className={getStatusColor(order.status)}>
                                  {order.status.replace(/_/g, ' ')}
                                </Badge>
                              </TableCell>
                              <TableCell>{order.salespersonName || '—'}</TableCell>
                              <TableCell>{order.manufacturerName || 'Unassigned'}</TableCell>
                              <TableCell>{formatCurrency(order.totalAmount)}</TableCell>
                              <TableCell>
                                {order.isPaid ? (
                                  <CheckCircle className="h-5 w-5 text-green-500" />
                                ) : (
                                  <AlertCircle className="h-5 w-5 text-yellow-500" />
                                )}
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    asChild
                                  >
                                    <a href={`/orders/${order.id}`} target="_blank" rel="noopener noreferrer">
                                      <FileText className="h-4 w-4" />
                                    </a>
                                  </Button>
                                  
                                  {!order.manufacturerId && order.status === 'pending_production' && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleAssignManufacturer(order.id)}
                                    >
                                      <UserCircle className="h-4 w-4" />
                                    </Button>
                                  )}
                                  
                                  {order.status === 'design_review' && 
                                   order.designTasks?.some((t: any) => t.status === 'submitted') && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => {
                                        const taskToApprove = order.designTasks.find((t: any) => t.status === 'submitted');
                                        if (taskToApprove) {
                                          handleApproveDesign(taskToApprove.id);
                                        }
                                      }}
                                    >
                                      <Shirt className="h-4 w-4" />
                                    </Button>
                                  )}
                                  
                                  {!order.isPaid && order.status !== 'draft' && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleMarkAsPaid(order.id)}
                                    >
                                      <DollarSign className="h-4 w-4" />
                                    </Button>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            
            {/* Errors & Logs Tab Content */}
            <TabsContent value="errors" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>System Logs & Errors</CardTitle>
                  <CardDescription>View and manage system errors and synchronization logs</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-12 text-gray-500">
                    <p className="mb-2">QuickBooks integration is currently disabled</p>
                    <p className="text-sm">Error logs and sync status will appear here once integration is configured</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </main>
      </div>
      
      {/* Assign Manufacturer Dialog */}
      <Dialog open={assignManufacturerDialogOpen} onOpenChange={setAssignManufacturerDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Manufacturer</DialogTitle>
            <DialogDescription>
              Select a manufacturer to assign to this order. The manufacturer will be responsible for production.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <Select
              value={selectedManufacturerId ? selectedManufacturerId.toString() : undefined}
              onValueChange={(value) => setSelectedManufacturerId(parseInt(value))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a manufacturer" />
              </SelectTrigger>
              <SelectContent>
                {!isManufacturersLoading && manufacturers?.map((m: any) => (
                  <SelectItem key={m.id} value={m.id.toString()}>
                    {m.firstName} {m.lastName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setAssignManufacturerDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button 
              onClick={confirmAssignManufacturer}
              disabled={!selectedManufacturerId || assignManufacturerMutation.isPending}
            >
              {assignManufacturerMutation.isPending ? "Assigning..." : "Assign"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}