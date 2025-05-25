import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency, formatDate, getStatusColor, getStatusLabel } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Eye, Edit, Trash2, Plus, Search, Filter, ChevronDown, Send, Palette, Factory, CheckCircle, XCircle, Upload, Image } from "lucide-react";

interface OrderItem {
  id?: number;
  productName: string;
  description: string;
  size: string;
  color: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

interface Order {
  id: string;
  orderNumber: string;
  customerId: string;
  status: string;
  totalAmount: number;
  notes: string;
  createdAt: string;
  items: OrderItem[];
  logoUrl?: string;
  companyName?: string;
}

export default function OrderManagePage() {
  const { user, role } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  // Fetch orders
  const { data: orders = [], isLoading } = useQuery<Order[]>({
    queryKey: ['/api/orders'],
    refetchInterval: 5000, // Refresh every 5 seconds
  });

  // Update order mutation
  const updateOrder = useMutation({
    mutationFn: async (orderData: Partial<Order>) => {
      return await apiRequest("PUT", `/api/orders/${orderData.id}`, orderData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
      setEditDialogOpen(false);
      setEditingOrder(null);
      toast({
        title: "Success",
        description: "Order updated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error", 
        description: "Failed to update order",
        variant: "destructive",
      });
    }
  });

  // Delete order mutation
  const deleteOrder = useMutation({
    mutationFn: async (orderId: string) => {
      return await apiRequest("DELETE", `/api/orders/${orderId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
      toast({
        title: "Success",
        description: "Order deleted successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete order", 
        variant: "destructive",
      });
    }
  });

  const handleViewOrder = (order: Order) => {
    setSelectedOrder(order);
    setViewDialogOpen(true);
  };

  const handleEditOrder = (order: Order) => {
    setEditingOrder({ ...order });
    setEditDialogOpen(true);
  };

  const handleUpdateOrder = () => {
    if (editingOrder) {
      // Auto-calculate total from line items with proper calculations
      const itemsTotal = editingOrder.items?.reduce((sum, item) => {
        const lineTotal = item.quantity * item.unitPrice;
        return sum + lineTotal;
      }, 0) || 0;
      
      const tax = itemsTotal * 0.08; // 8% tax
      const finalTotal = itemsTotal + tax;
      
      // Update all item totals before saving
      const updatedItems = editingOrder.items?.map(item => ({
        ...item,
        totalPrice: item.quantity * item.unitPrice
      })) || [];
      
      const updatedOrder = {
        ...editingOrder,
        items: updatedItems,
        totalAmount: finalTotal,
        tax: tax
      };
      
      console.log('Saving order with calculated totals:', {
        itemsTotal,
        tax,
        finalTotal,
        itemCount: updatedItems.length
      });
      
      updateOrder.mutate(updatedOrder);
    }
  };

  // Handle logo file upload
  const handleLogoUpload = async (file: File) => {
    if (!editingOrder) return;
    
    // Validate file type
    if (!file.type.includes('webp') && !file.type.includes('image')) {
      toast({
        title: "Invalid file type",
        description: "Please upload a WebP image file",
        variant: "destructive"
      });
      return;
    }

    setUploadingLogo(true);
    
    try {
      const formData = new FormData();
      formData.append('logo', file);
      formData.append('customerId', editingOrder.customerId);
      
      const response = await fetch('/api/upload/logo', {
        method: 'POST',
        body: formData
      });
      
      if (response.ok) {
        const result = await response.json();
        setEditingOrder({
          ...editingOrder,
          logoUrl: result.logoUrl,
          companyName: result.companyName || editingOrder.companyName
        });
        
        toast({
          title: "Success",
          description: "Logo uploaded successfully"
        });
      } else {
        throw new Error('Upload failed');
      }
    } catch (error) {
      toast({
        title: "Upload failed",
        description: "Could not upload logo. Please try again.",
        variant: "destructive"
      });
    } finally {
      setUploadingLogo(false);
    }
  };

  const getLogoDisplay = (order: Order) => {
    if (order.logoUrl) {
      return {
        logoUrl: order.logoUrl,
        company: order.companyName || 'Custom Company',
        hasImage: true
      };
    }
    
    // Fallback to initials if no logo
    return {
      company: order.companyName || 'Custom Clothing Co.',
      initials: order.orderNumber.slice(-3),
      hasImage: false
    };
  };

  const handleWorkflowAction = (orderId: string, action: string) => {
    let newStatus = '';
    switch (action) {
      case 'send_to_designer':
        newStatus = 'pending_design';
        break;
      case 'send_to_manufacturer':
        newStatus = 'pending_production';
        break;
      case 'approve_design':
        newStatus = 'design_approved';
        break;
      case 'start_production':
        newStatus = 'in_production';
        break;
      case 'complete_order':
        newStatus = 'completed';
        break;
      case 'cancel_order':
        newStatus = 'cancelled';
        break;
      default:
        return;
    }
    
    updateOrder.mutate({ id: orderId, status: newStatus });
  };

  const handleDeleteOrder = (orderId: string) => {
    if (window.confirm("Are you sure you want to delete this order?")) {
      deleteOrder.mutate(orderId);
    }
  };

  const filteredOrders = orders.filter(order =>
    order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.status.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin h-10 w-10 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Order Management</h1>
          <p className="text-gray-600">View and manage all orders</p>
        </div>
        
        <div className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search orders..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
      </div>

      {/* Orders Table */}
      <Card>
        <CardHeader>
          <CardTitle>Orders ({filteredOrders.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredOrders.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">No orders found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Company & Order
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Created
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Items
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Workflow
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-3">
                          {/* Customer Logo Display */}
                          <div className="flex-shrink-0 h-10 w-10">
                            {getLogoDisplay(order).hasImage ? (
                              <img 
                                src={getLogoDisplay(order).logoUrl} 
                                alt="Customer Logo"
                                className="h-10 w-10 rounded-lg object-cover border-2 border-gray-200"
                                onError={(e) => {
                                  // Fallback to initials if image fails to load
                                  const target = e.target as HTMLImageElement;
                                  target.style.display = 'none';
                                  target.nextElementSibling?.classList.remove('hidden');
                                }}
                              />
                            ) : null}
                            <div className={`h-10 w-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center ${getLogoDisplay(order).hasImage ? 'hidden' : ''}`}>
                              <span className="text-white font-bold text-sm">
                                {getLogoDisplay(order).initials}
                              </span>
                            </div>
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {order.orderNumber}
                            </div>
                            <div className="text-sm text-gray-500">
                              {getLogoDisplay(order).company}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge className={getStatusColor(order.status)}>
                          {getStatusLabel(order.status)}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(order.totalAmount)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(order.createdAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {order.items?.length || 0} items
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm">
                              Workflow <ChevronDown className="ml-2 h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start">
                            <DropdownMenuItem 
                              onClick={() => handleWorkflowAction(order.id, 'send_to_designer')}
                              className="flex items-center"
                            >
                              <Palette className="mr-2 h-4 w-4" />
                              Send to Designer
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleWorkflowAction(order.id, 'approve_design')}
                              className="flex items-center"
                            >
                              <CheckCircle className="mr-2 h-4 w-4" />
                              Approve Design
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleWorkflowAction(order.id, 'send_to_manufacturer')}
                              className="flex items-center"
                            >
                              <Factory className="mr-2 h-4 w-4" />
                              Send to Manufacturer
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleWorkflowAction(order.id, 'start_production')}
                              className="flex items-center"
                            >
                              <Send className="mr-2 h-4 w-4" />
                              Start Production
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleWorkflowAction(order.id, 'complete_order')}
                              className="flex items-center"
                            >
                              <CheckCircle className="mr-2 h-4 w-4 text-green-600" />
                              Complete Order
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleWorkflowAction(order.id, 'cancel_order')}
                              className="flex items-center text-red-600"
                            >
                              <XCircle className="mr-2 h-4 w-4" />
                              Cancel Order
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewOrder(order)}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditOrder(order)}
                            className="text-green-600 hover:text-green-900"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteOrder(order.id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* View Order Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Order Details - {selectedOrder?.orderNumber}</DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-gray-500">Status</Label>
                  <Badge className={`mt-1 ${getStatusColor(selectedOrder.status)}`}>
                    {getStatusLabel(selectedOrder.status)}
                  </Badge>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">Total</Label>
                  <p className="text-lg font-semibold">{formatCurrency(selectedOrder.totalAmount)}</p>
                </div>
              </div>
              
              <div>
                <Label className="text-sm font-medium text-gray-500">Notes</Label>
                <p className="mt-1 text-sm text-gray-700">{selectedOrder.notes || "No notes"}</p>
              </div>

              <div>
                <Label className="text-sm font-medium text-gray-500">Order Items</Label>
                <div className="mt-2 border rounded-lg overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Size</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Color</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Qty</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Price</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {selectedOrder.items?.map((item, index) => (
                        <tr key={index}>
                          <td className="px-4 py-2 text-sm text-gray-900">{item.productName}</td>
                          <td className="px-4 py-2 text-sm text-gray-500">{item.size}</td>
                          <td className="px-4 py-2 text-sm text-gray-500">{item.color}</td>
                          <td className="px-4 py-2 text-sm text-gray-900 text-right">{item.quantity}</td>
                          <td className="px-4 py-2 text-sm text-gray-900 text-right">{formatCurrency(item.unitPrice)}</td>
                          <td className="px-4 py-2 text-sm text-gray-900 text-right">{formatCurrency(item.totalPrice)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Order Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Order - {editingOrder?.orderNumber}</DialogTitle>
          </DialogHeader>
          {editingOrder && (
            <div className="space-y-6">
              {/* Logo and Company Section */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <Label className="text-lg font-semibold mb-3 block">Customer Logo & Branding</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="logoUpload">Upload Customer Logo (WebP)</Label>
                    <div className="mt-2">
                      <div className="flex items-center justify-center w-full">
                        <label 
                          htmlFor="logoUpload" 
                          className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100"
                        >
                          <div className="flex flex-col items-center justify-center pt-5 pb-6">
                            <Upload className="w-8 h-8 mb-4 text-gray-500" />
                            <p className="mb-2 text-sm text-gray-500">
                              <span className="font-semibold">Click to upload</span> customer logo
                            </p>
                            <p className="text-xs text-gray-500">WebP, PNG, or JPG (MAX. 2MB)</p>
                          </div>
                          <input 
                            id="logoUpload" 
                            type="file" 
                            className="hidden" 
                            accept=".webp,.png,.jpg,.jpeg"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleLogoUpload(file);
                            }}
                            disabled={uploadingLogo}
                          />
                        </label>
                      </div>
                      {uploadingLogo && (
                        <div className="mt-2 text-sm text-blue-600">
                          Uploading logo...
                        </div>
                      )}
                    </div>
                    
                    <div className="mt-3">
                      <Label htmlFor="companyName">Company Name</Label>
                      <Input
                        id="companyName"
                        value={editingOrder.companyName || ''}
                        onChange={(e) => 
                          setEditingOrder({ ...editingOrder, companyName: e.target.value })
                        }
                        placeholder="Enter company name"
                        className="mt-1"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label>Current Logo Preview</Label>
                    <div className="flex items-center space-x-3 mt-2 p-3 border rounded-lg bg-white">
                      <div className="flex-shrink-0 h-12 w-12">
                        {getLogoDisplay(editingOrder).hasImage ? (
                          <img 
                            src={getLogoDisplay(editingOrder).logoUrl} 
                            alt="Customer Logo"
                            className="h-12 w-12 rounded-lg object-cover border-2 border-gray-200"
                          />
                        ) : (
                          <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                            <span className="text-white font-bold text-sm">
                              {getLogoDisplay(editingOrder).initials}
                            </span>
                          </div>
                        )}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {editingOrder.orderNumber}
                        </div>
                        <div className="text-sm text-gray-500">
                          {getLogoDisplay(editingOrder).company}
                        </div>
                        <div className="text-xs text-gray-400">
                          {getLogoDisplay(editingOrder).hasImage ? 'Custom logo uploaded' : 'Using default initials'}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={editingOrder.status}
                    onValueChange={(value) => 
                      setEditingOrder({ ...editingOrder, status: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="pending_design">Pending Design</SelectItem>
                      <SelectItem value="design_in_progress">Design In Progress</SelectItem>
                      <SelectItem value="design_review">Design Review</SelectItem>
                      <SelectItem value="design_approved">Design Approved</SelectItem>
                      <SelectItem value="pending_production">Pending Production</SelectItem>
                      <SelectItem value="in_production">In Production</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="totalAmount">Total Amount (Auto-calculated)</Label>
                  <Input
                    id="totalAmount"
                    type="number"
                    step="0.01"
                    value={editingOrder.items?.reduce((sum, item) => sum + item.totalPrice, 0) || 0}
                    disabled
                    className="bg-gray-100"
                  />
                  <p className="text-xs text-gray-500 mt-1">This amount updates automatically from line items</p>
                </div>
              </div>
              
              <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={editingOrder.notes}
                  onChange={(e) => 
                    setEditingOrder({ ...editingOrder, notes: e.target.value })
                  }
                  rows={3}
                />
              </div>

              {/* Line Items Editor */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <Label className="text-lg font-semibold">Order Items</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const newItem: OrderItem = {
                        productName: '',
                        description: '',
                        size: '',
                        color: '',
                        quantity: 1,
                        unitPrice: 0,
                        totalPrice: 0
                      };
                      setEditingOrder({
                        ...editingOrder,
                        items: [...(editingOrder.items || []), newItem]
                      });
                    }}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Item
                  </Button>
                </div>

                <div className="border rounded-lg overflow-hidden">
                  <div className="bg-gray-50 px-4 py-2 grid grid-cols-12 gap-2 text-xs font-medium text-gray-500 uppercase">
                    <div className="col-span-3">Product</div>
                    <div className="col-span-2">Size</div>
                    <div className="col-span-2">Color</div>
                    <div className="col-span-1">Qty</div>
                    <div className="col-span-2">Unit Price</div>
                    <div className="col-span-1">Total</div>
                    <div className="col-span-1">Actions</div>
                  </div>
                  
                  {editingOrder.items?.map((item, index) => (
                    <div key={index} className="px-4 py-3 grid grid-cols-12 gap-2 border-b border-gray-200 last:border-b-0">
                      <div className="col-span-3 space-y-2">
                        <Input
                          value={item.productName}
                          onChange={(e) => {
                            const updatedItems = [...editingOrder.items];
                            updatedItems[index] = { ...item, productName: e.target.value };
                            setEditingOrder({ ...editingOrder, items: updatedItems });
                          }}
                          placeholder="Product name"
                          className="text-sm"
                        />
                        <Input
                          value={item.description}
                          onChange={(e) => {
                            const updatedItems = [...editingOrder.items];
                            updatedItems[index] = { ...item, description: e.target.value };
                            setEditingOrder({ ...editingOrder, items: updatedItems });
                          }}
                          placeholder="Product description"
                          className="text-sm text-gray-600"
                        />
                      </div>
                      <div className="col-span-2">
                        <div className="space-y-1">
                          <p className="text-xs text-gray-500 font-medium mb-1">Available Sizes:</p>
                          <div className="grid grid-cols-3 gap-1">
                            {['YS', 'YM', 'YL', 'AXS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL', 'No Sizes'].map((size) => (
                              <button
                                key={size}
                                type="button"
                                onClick={() => {
                                  const updatedItems = [...editingOrder.items];
                                  updatedItems[index] = { ...item, size };
                                  setEditingOrder({ ...editingOrder, items: updatedItems });
                                }}
                                className={`text-xs px-2 py-1 rounded border transition-colors ${
                                  item.size === size 
                                    ? 'bg-blue-500 text-white border-blue-500' 
                                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                                }`}
                              >
                                {size}
                              </button>
                            ))}
                          </div>
                          <p className="text-xs text-gray-400 mt-1">
                            Selected: <span className="font-medium">{item.size || 'None'}</span>
                          </p>
                        </div>
                      </div>
                      <div className="col-span-2">
                        <Input
                          value={item.color}
                          onChange={(e) => {
                            const updatedItems = [...editingOrder.items];
                            updatedItems[index] = { ...item, color: e.target.value };
                            setEditingOrder({ ...editingOrder, items: updatedItems });
                          }}
                          placeholder="Color"
                          className="text-sm"
                        />
                      </div>
                      <div className="col-span-1">
                        <Input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => {
                            const quantity = parseInt(e.target.value) || 1;
                            const updatedItems = [...editingOrder.items];
                            const totalPrice = quantity * item.unitPrice;
                            updatedItems[index] = { ...item, quantity, totalPrice };
                            setEditingOrder({ ...editingOrder, items: updatedItems });
                          }}
                          className="text-sm"
                        />
                      </div>
                      <div className="col-span-2">
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={item.unitPrice}
                          onChange={(e) => {
                            const unitPrice = parseFloat(e.target.value) || 0;
                            const updatedItems = [...editingOrder.items];
                            const totalPrice = item.quantity * unitPrice;
                            updatedItems[index] = { ...item, unitPrice, totalPrice };
                            setEditingOrder({ ...editingOrder, items: updatedItems });
                          }}
                          className="text-sm"
                        />
                      </div>
                      <div className="col-span-1">
                        <div className="text-sm font-medium py-2 bg-gray-50 px-2 rounded">
                          {formatCurrency(item.quantity * item.unitPrice)}
                        </div>
                        <p className="text-xs text-gray-400">
                          {item.quantity} × ${item.unitPrice}
                        </p>
                      </div>
                      <div className="col-span-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            const updatedItems = editingOrder.items.filter((_, i) => i !== index);
                            setEditingOrder({ 
                              ...editingOrder, 
                              items: updatedItems,
                              totalAmount: updatedItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0)
                            });
                          }}
                          className="text-red-600 hover:text-red-800"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  
                  {editingOrder.items?.length === 0 && (
                    <div className="px-4 py-8 text-center text-gray-500">
                      <p>No items added to this order yet.</p>
                      <p className="text-sm">Click "Add Item" to get started.</p>
                    </div>
                  )}
                </div>

                {/* Order Total */}
                <div className="flex justify-end">
                  <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
                    <div className="text-right">
                      <div className="text-sm text-green-600">
                        Items Total: {formatCurrency(
                          editingOrder.items?.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0) || 0
                        )}
                      </div>
                      <div className="text-sm text-gray-500 mt-1">
                        Tax (8%): {formatCurrency(
                          (editingOrder.items?.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0) || 0) * 0.08
                        )}
                      </div>
                      <div className="text-lg font-bold text-green-700 border-t border-green-200 pt-2 mt-2">
                        Order Total: {formatCurrency(
                          (editingOrder.items?.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0) || 0) * 1.08
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-1">Updates automatically as you edit items</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button 
                  variant="outline" 
                  onClick={() => setEditDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleUpdateOrder}
                  disabled={updateOrder.isPending}
                >
                  {updateOrder.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}