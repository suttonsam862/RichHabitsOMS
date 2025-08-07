import React, { useState, useEffect } from 'react';
import { useParams, useLocation } from 'wouter';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useFieldArray } from 'react-hook-form';
import { z } from 'zod';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useFormValidation } from '@/hooks/useFormValidation';
import { useFormNavigationBlock } from '@/hooks/useFormNavigationBlock';
import { useUndoableDelete } from '@/hooks/useUndoableDelete';
import DeleteConfirmationModal from '@/components/ui/DeleteConfirmationModal';
import ManufacturerCard from '@/components/ManufacturerCard';
import { ProductionImageUploader } from '@/components/ProductionImageUploader';
import OrderAuditHistory from '@/components/OrderAuditHistory';
import { ProductionImageTimeline } from '@/components/ProductionImageTimeline';
import {
  Loader2,
  Plus,
  Trash2,
  Save,
  ArrowLeft,
  Edit,
  User,
  Factory,
  Package,
  FileText,
  DollarSign,
  Calendar,
  AlertTriangle,
  Check,
  X,
  Activity
} from 'lucide-react';
import { apiRequest, getQueryFn } from '@/lib/queryClient';
import { useSmartFetch } from '@/hooks/useSmartFetch';

// Enhanced schema for order editing
const orderItemSchema = z.object({
  id: z.string().optional(),
  catalogItemId: z.string().uuid().optional(),
  productName: z.string().min(1, 'Product name is required'),
  description: z.string().optional(),
  size: z.string().optional(),
  color: z.string().optional(),
  fabric: z.string().optional(),
  customization: z.string().optional(),
  quantity: z.number().min(1, 'Quantity must be at least 1'),
  unitPrice: z.number().min(0, 'Unit price must be non-negative'),
  totalPrice: z.number().min(0, 'Total price must be non-negative'),
  status: z.enum(['pending', 'designing', 'approved', 'in_production', 'completed']).optional(),
  productionNotes: z.string().optional(),
  estimatedCompletionDate: z.string().optional(),
});

const orderEditSchema = z.object({
  id: z.string().optional(),
  orderNumber: z.string().min(1, 'Order number is required'),
  customerId: z.string().min(1, 'Customer is required'),
  status: z.enum(['draft', 'pending_design', 'design_in_progress', 'design_review', 'design_approved', 'pending_production', 'in_production', 'completed', 'cancelled']),
  priority: z.enum(['low', 'medium', 'high']).optional(),
  assignedDesignerId: z.string().optional(),
  assignedManufacturerId: z.string().optional(),
  notes: z.string().optional(),
  internalNotes: z.string().optional(),
  customerRequirements: z.string().optional(),
  deliveryAddress: z.string().optional(),
  deliveryInstructions: z.string().optional(),
  rushOrder: z.boolean().optional(),
  estimatedDeliveryDate: z.string().optional(),
  items: z.array(orderItemSchema).min(1, 'At least one item is required'),
});

type OrderEditFormValues = z.infer<typeof orderEditSchema>;

interface Customer {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  company?: string;
}

interface Manufacturer {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  company?: string;
  custom_attributes?: {
    capabilities?: {
      fabrics?: string[];
      sports?: string[];
      max_order_volume?: number;
      lead_time_days?: number;
    };
    media?: Array<{
      type: string;
      url: string;
      fileName: string;
    }>;
  };
}

interface Designer {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  activeOrders?: number;
}

export default function OrderEditPage() {
  const { id } = useParams<{ id: string }>();
  const [location, setLocation] = useLocation();
  const navigate = setLocation;
  const { toast } = useToast();
  
  // Local state management
  const [order, setOrder] = React.useState<any>(null);
  const [orderLoading, setOrderLoading] = React.useState(true);
  const [isSaving, setIsSaving] = React.useState(false);
  
  const [showManufacturerDialog, setShowManufacturerDialog] = useState(false);
  const [selectedManufacturerId, setSelectedManufacturerId] = useState<string>('');
  const [isSubmitDisabled, setIsSubmitDisabled] = useState(false);

  const isEditing = id !== 'new';

  // Undoable delete with confirmation modal for orders
  const {
    softDelete,
    isDeleting,
    showConfirmation,
    confirmationData,
    handleConfirmDelete,
    handleCancelConfirmation,
    confirmationItemType,
    requiresTyping
  } = useUndoableDelete({
    entityName: 'order',
    deleteEndpoint: '/api/orders',
    invalidateQueries: ['/api/orders'],
    requiresConfirmation: isEditing, // Only require confirmation for existing orders, not drafts
    confirmationItemType: 'order',
    requiresTyping: true, // High-risk operation
    onDeleteSuccess: () => {
      toast({
        title: "Order Deleted",
        description: "The order has been successfully deleted.",
        variant: "default"
      });
      navigate('/orders');
    }
  });

  // State for loading dependencies
  const [customers, setCustomers] = React.useState<Customer[]>([]);
  const [manufacturers, setManufacturers] = React.useState<any[]>([]);
  const [designers, setDesigners] = React.useState<any[]>([]);
  const [catalogItems, setCatalogItems] = React.useState<any[]>([]);
  const [loadingDependencies, setLoadingDependencies] = React.useState(true);

  // Fetch order data
  const fetchOrder = async () => {
    if (!id || !isEditing) {
      setOrderLoading(false);
      return;
    }
    
    setOrderLoading(true);
    try {
      const response = await fetch(`/api/orders/${id}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem('authToken');
          navigate('/login');
          return;
        }
        throw new Error('Failed to fetch order');
      }
      
      const result = await response.json();
      const orderData = result.data || result;
      setOrder(orderData);
    } catch (error: any) {
      toast({
        title: "Error loading order",
        description: error.message || "Failed to load order details.",
        variant: "destructive",
      });
    } finally {
      setOrderLoading(false);
    }
  };

  // Fetch all dependencies
  const fetchDependencies = async () => {
    setLoadingDependencies(true);
    try {
      const [customersRes, manufacturersRes, designersRes, catalogRes] = await Promise.all([
        fetch('/api/customers', {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
        }),
        fetch('/api/manufacturing/manufacturers', {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
        }),
        fetch('/api/user-management/users?role=designer', {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
        }),
        fetch('/api/catalog', {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
        })
      ]);

      const [customersData, manufacturersData, designersData, catalogData] = await Promise.all([
        customersRes.json(),
        manufacturersRes.json(),
        designersRes.json(),
        catalogRes.json()
      ]);

      setCustomers(Array.isArray(customersData.data) ? customersData.data : []);
      setManufacturers(Array.isArray(manufacturersData.data) ? manufacturersData.data : []);
      setDesigners(Array.isArray(designersData.data) ? designersData.data : []);
      setCatalogItems(Array.isArray(catalogData.data) ? catalogData.data : []);
    } catch (error: any) {
      toast({
        title: "Error loading data",
        description: "Failed to load customers, manufacturers, designers, or catalog items.",
        variant: "destructive",
      });
    } finally {
      setLoadingDependencies(false);
    }
  };

  // Load data on mount
  React.useEffect(() => {
    fetchOrder();
    fetchDependencies();
  }, [id, isEditing]);

  // Form setup
  const form = useForm<OrderEditFormValues>({
    resolver: zodResolver(orderEditSchema),
    defaultValues: {
      orderNumber: '',
      customerId: '',
      status: 'draft',
      priority: 'medium',
      assignedDesignerId: '',
      assignedManufacturerId: '',
      notes: '',
      internalNotes: '',
      customerRequirements: '',
      deliveryAddress: '',
      deliveryInstructions: '',
      rushOrder: false,
      estimatedDeliveryDate: '',
      items: [{
        catalogItemId: '',
        productName: '',
        description: '',
        size: '',
        color: '',
        fabric: '',
        customization: '',
        quantity: 1,
        unitPrice: 0,
        totalPrice: 0,
        status: 'pending',
        productionNotes: '',
        estimatedCompletionDate: '',
      }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'items',
  });

  // Store initial data for comparison
  const [initialData, setInitialData] = useState<OrderEditFormValues | undefined>(undefined);

  // Update form when order data loads
  useEffect(() => {
    if (order && isEditing) {
      const formData: OrderEditFormValues = {
        id: order.id,
        orderNumber: order.orderNumber || '',
        customerId: order.customerId || '',
        status: order.status || 'draft',
        priority: order.priority || 'medium',
        assignedDesignerId: order.assignedDesignerId || '',
        assignedManufacturerId: order.assignedManufacturerId || '',
        notes: order.notes || '',
        internalNotes: order.internalNotes || '',
        customerRequirements: order.customerRequirements || '',
        deliveryAddress: order.deliveryAddress || '',
        deliveryInstructions: order.deliveryInstructions || '',
        rushOrder: order.rushOrder || false,
        estimatedDeliveryDate: order.estimatedDeliveryDate || '',
        items: order.items?.map((item: any) => ({
          id: item.id,
          catalogItemId: item.catalogItemId || item.catalog_item_id || '',
          productName: item.productName || item.product_name || '',
          description: item.description || '',
          size: item.size || '',
          color: item.color || '',
          fabric: item.fabric || '',
          customization: item.customization || '',
          quantity: item.quantity || 1,
          unitPrice: parseFloat(item.unitPrice || item.unit_price || '0'),
          totalPrice: parseFloat(item.totalPrice || item.total_price || '0'),
          status: item.status || 'pending',
          productionNotes: item.productionNotes || item.production_notes || '',
          estimatedCompletionDate: item.estimatedCompletionDate || item.estimated_completion_date || '',
        })) || [{
          catalogItemId: '',
          productName: '',
          description: '',
          size: '',
          color: '',
          fabric: '',
          customization: '',
          quantity: 1,
          unitPrice: 0,
          totalPrice: 0,
          status: 'pending',
          productionNotes: '',
          estimatedCompletionDate: '',
        }],
      };

      form.reset(formData);
      setInitialData(formData);
      setSelectedManufacturerId(order.assignedManufacturerId || '');
    } else if (!isEditing) {
      // Generate order number for new orders
      const timestamp = Date.now().toString().slice(-8);
      const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
      form.setValue('orderNumber', `ORD-${timestamp}-${random}`);
    }
  }, [order, isEditing, form]);

  // Form validation hook
  const validation = useFormValidation({
    form,
    initialData,
    requiredFields: ['orderNumber', 'customerId'],
    ignoreFields: ['id'] // Don't require changes to ID for form validity
  });

  // Block navigation during form submission
  useFormNavigationBlock({
    when: validation.isSubmitDisabled || isSaving,
    message: "Your order is being saved. Please wait for the process to complete before leaving."
  });

  // Calculate item total when quantity or unit price changes
  const calculateItemTotal = (index: number) => {
    const quantity = form.watch(`items.${index}.quantity`);
    const unitPrice = form.watch(`items.${index}.unitPrice`);
    const total = quantity * unitPrice;
    form.setValue(`items.${index}.totalPrice`, total);
    return total;
  };

  // Add new item
  const addItem = () => {
    append({
      catalogItemId: '',
      productName: '',
      description: '',
      size: '',
      color: '',
      fabric: '',
      customization: '',
      quantity: 1,
      unitPrice: 0,
      totalPrice: 0,
      status: 'pending',
      productionNotes: '',
      estimatedCompletionDate: '',
    });
  };

  // Remove item
  const removeItem = (index: number) => {
    if (fields.length > 1) {
      remove(index);
    } else {
      toast({
        title: 'Cannot Remove',
        description: 'At least one item is required',
        variant: 'destructive',
      });
    }
  };

  // Handle manufacturer selection
  const handleManufacturerSelect = (manufacturer: Manufacturer) => {
    form.setValue('assignedManufacturerId', manufacturer.id);
    setSelectedManufacturerId(manufacturer.id);
    setShowManufacturerDialog(false);
    
    toast({
      title: 'Manufacturer Selected',
      description: `${manufacturer.company || `${manufacturer.firstName} ${manufacturer.lastName}`} has been assigned to this order.`,
    });
  };



  // Order save function with async/await
  const saveOrder = async (data: OrderEditFormValues) => {
    const method = isEditing ? 'PATCH' : 'POST';
    const endpoint = isEditing ? `/api/orders/${id}` : '/api/orders';

    // Transform data for backend compatibility
    const transformedData = {
      orderNumber: data.orderNumber,
      customerId: data.customerId,
      status: data.status,
      priority: data.priority,
      assignedDesignerId: data.assignedDesignerId || null,
      assignedManufacturerId: data.assignedManufacturerId || null,
      notes: data.notes || '',
      internalNotes: data.internalNotes || '',
      customerRequirements: data.customerRequirements || '',
      deliveryAddress: data.deliveryAddress || '',
      deliveryInstructions: data.deliveryInstructions || '',
      rushOrder: data.rushOrder || false,
      estimatedDeliveryDate: data.estimatedDeliveryDate || null,
      items: data.items.map((item, index) => ({
        ...(item.id && { id: item.id }),
        catalog_item_id: item.catalogItemId || null,
        product_name: item.productName,
        description: item.description || '',
        size: item.size || '',
        color: item.color || '',
        fabric: item.fabric || '',
        customization: item.customization || '',
        quantity: item.quantity,
        unit_price: item.unitPrice,
        total_price: item.totalPrice,
        status: item.status || 'pending',
        production_notes: item.productionNotes || '',
        estimated_completion_date: item.estimatedCompletionDate || null,
        order_index: index
      })),
    };

    const response = await fetch(endpoint, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
      },
      body: JSON.stringify(transformedData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to save order');
    }
    return response.json();
  };

  // Form submission handler with async/await
  const onSubmit = async (data: OrderEditFormValues) => {
    // Check validation and submit state before submitting
    if (!validation.canSubmit || isSubmitDisabled) {
      if (isSubmitDisabled) {
        toast({
          title: "Please wait",
          description: "Form is being processed. Please wait before submitting again.",
          variant: "destructive",
        });
        return;
      }
      
      toast({
        title: "Cannot submit form",
        description: validation.errors.length > 0 
          ? validation.errors[0] 
          : validation.hasChanges 
            ? "Please fix form errors before submitting"
            : "No changes to save",
        variant: "destructive",
      });
      return;
    }
    
    // Disable submit button immediately
    setIsSubmitDisabled(true);
    setIsSaving(true);

    try {
      const result = await saveOrder(data);
      
      toast({
        title: 'Order Saved',
        description: `Order ${form.getValues('orderNumber')} has been ${isEditing ? 'updated' : 'created'} successfully.`,
      });
      
      // Update form with new values from response for editing mode
      if (isEditing) {
        const updatedOrder = result.data || result;
        if (updatedOrder) {
          const formData: OrderEditFormValues = {
            id: updatedOrder.id,
            orderNumber: updatedOrder.orderNumber || '',
            customerId: updatedOrder.customerId || '',
            status: updatedOrder.status || 'draft',
            priority: updatedOrder.priority || 'medium',
            assignedDesignerId: updatedOrder.assignedDesignerId || '',
            assignedManufacturerId: updatedOrder.assignedManufacturerId || '',
            notes: updatedOrder.notes || '',
            internalNotes: updatedOrder.internalNotes || '',
            customerRequirements: updatedOrder.customerRequirements || '',
            deliveryAddress: updatedOrder.deliveryAddress || '',
            deliveryInstructions: updatedOrder.deliveryInstructions || '',
            rushOrder: updatedOrder.rushOrder || false,
            estimatedDeliveryDate: updatedOrder.estimatedDeliveryDate || '',
            items: updatedOrder.items?.map((item: any) => ({
              id: item.id,
              catalogItemId: item.catalogItemId || item.catalog_item_id || '',
              productName: item.productName || item.product_name || '',
              description: item.description || '',
              size: item.size || '',
              color: item.color || '',
              fabric: item.fabric || '',
              customization: item.customization || '',
              quantity: item.quantity || 1,
              unitPrice: parseFloat(item.unitPrice || item.unit_price || '0'),
              totalPrice: parseFloat(item.totalPrice || item.total_price || '0'),
              status: item.status || 'pending',
              productionNotes: item.productionNotes || item.production_notes || '',
              estimatedCompletionDate: item.estimatedCompletionDate || item.estimated_completion_date || '',
            })) || []
          };
          
          form.reset(formData);
          setInitialData(formData);
          setOrder(updatedOrder);
        }
      }
      
      // Navigate to order list or detail page
      navigate('/orders');
    } catch (error: any) {
      toast({
        title: 'Save Failed',
        description: error.message || "Failed to save order",
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
      // Re-enable submit after 1 second
      setTimeout(() => setIsSubmitDisabled(false), 1000);
    }
  };

  if (orderLoading || loadingDependencies) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        <span className="ml-2">Loading order data...</span>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/orders')}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Orders
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              {isEditing ? 'Edit Order' : 'Create New Order'}
            </h1>
            <p className="text-muted-foreground">
              {isEditing ? `Update order ${order?.orderNumber}` : 'Create a new customer order with detailed specifications'}
            </p>
            {isEditing && order?.updated_at && (
              <p className="text-sm text-muted-foreground">
                Last updated: {new Date(order.updated_at).toLocaleString()}
              </p>
            )}
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          {isEditing && (
            <Badge variant={order?.status === 'completed' ? 'default' : 'secondary'}>
              {order?.status?.replace('_', ' ').toUpperCase()}
            </Badge>
          )}
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          
          {/* Delete Confirmation Modal */}
          <DeleteConfirmationModal
            isOpen={showConfirmation}
            onClose={handleCancelConfirmation}
            onConfirm={handleConfirmDelete}
            title="Delete Order"
            description={`Are you sure you want to delete order "${confirmationData?.itemDisplayName || 'this order'}"? This is a high-risk operation that will permanently remove all order data, items, and production history.`}
            itemName={confirmationData?.itemDisplayName}
            itemType={confirmationItemType}
            requiresTyping={requiresTyping}
            isDeleting={isDeleting}
          />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Order Details */}
            <div className="lg:col-span-2 space-y-6">
              {/* Basic Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <FileText className="w-5 h-5 mr-2" />
                    Order Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="orderNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Order Number</FormLabel>
                          <FormControl>
                            <Input {...field} readOnly className="bg-gray-50" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="customerId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Customer</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select customer" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {customers.map((customer: Customer) => (
                                <SelectItem key={customer.id} value={customer.id}>
                                  {customer.firstName} {customer.lastName} - {customer.company || customer.email}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="status"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Status</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
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
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="priority"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Priority</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="low">Low</SelectItem>
                              <SelectItem value="medium">Medium</SelectItem>
                              <SelectItem value="high">High</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="estimatedDeliveryDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Estimated Delivery</FormLabel>
                          <FormControl>
                            <Input {...field} type="date" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Order Items */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Package className="w-5 h-5 mr-2" />
                      Order Items
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addItem}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Item
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {fields.map((field, index) => (
                      <Card key={field.id} className="border-l-4 border-l-blue-500">
                        <CardContent className="pt-4">
                          <div className="flex items-center justify-between mb-4">
                            <h4 className="font-semibold">Item {index + 1}</h4>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => removeItem(index)}
                              disabled={fields.length === 1}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField
                              control={form.control}
                              name={`items.${index}.catalogItemId`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Catalog Item</FormLabel>
                                  <Select 
                                    onValueChange={(value) => {
                                      field.onChange(value);
                                      // Auto-fill product name from catalog item
                                      const selectedItem = catalogItems.find((item: any) => item.id === value);
                                      if (selectedItem) {
                                        form.setValue(`items.${index}.productName`, selectedItem.name);
                                        form.setValue(`items.${index}.unitPrice`, parseFloat(selectedItem.base_price || selectedItem.basePrice || '0'));
                                        calculateItemTotal(index);
                                      }
                                    }}
                                    value={field.value}
                                  >
                                    <FormControl>
                                      <SelectTrigger>
                                        <SelectValue placeholder="Select catalog item (optional)" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      <SelectItem value="">Custom Item (no catalog reference)</SelectItem>
                                      {catalogItems.map((item: any) => (
                                        <SelectItem key={item.id} value={item.id}>
                                          {item.name} - ${parseFloat(item.base_price || item.basePrice || '0').toFixed(2)}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={form.control}
                              name={`items.${index}.productName`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Product Name</FormLabel>
                                  <FormControl>
                                    <Input {...field} placeholder="Enter product name" />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={form.control}
                              name={`items.${index}.status`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Item Status</FormLabel>
                                  <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl>
                                      <SelectTrigger>
                                        <SelectValue />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      <SelectItem value="pending">Pending</SelectItem>
                                      <SelectItem value="designing">Designing</SelectItem>
                                      <SelectItem value="approved">Approved</SelectItem>
                                      <SelectItem value="in_production">In Production</SelectItem>
                                      <SelectItem value="completed">Completed</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={form.control}
                              name={`items.${index}.size`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Size</FormLabel>
                                  <FormControl>
                                    <Input {...field} placeholder="e.g., XL, Large, 42" />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={form.control}
                              name={`items.${index}.color`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Color</FormLabel>
                                  <FormControl>
                                    <Input {...field} placeholder="e.g., Navy Blue, Red" />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={form.control}
                              name={`items.${index}.fabric`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Fabric</FormLabel>
                                  <FormControl>
                                    <Input {...field} placeholder="e.g., Cotton, Polyester" />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={form.control}
                              name={`items.${index}.quantity`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Quantity</FormLabel>
                                  <FormControl>
                                    <Input
                                      {...field}
                                      type="number"
                                      min="1"
                                      onChange={(e) => {
                                        field.onChange(parseInt(e.target.value) || 1);
                                        calculateItemTotal(index);
                                      }}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={form.control}
                              name={`items.${index}.unitPrice`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Unit Price ($)</FormLabel>
                                  <FormControl>
                                    <Input
                                      {...field}
                                      type="number"
                                      step="0.01"
                                      min="0"
                                      onChange={(e) => {
                                        field.onChange(parseFloat(e.target.value) || 0);
                                        calculateItemTotal(index);
                                      }}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={form.control}
                              name={`items.${index}.totalPrice`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Total Price ($)</FormLabel>
                                  <FormControl>
                                    <Input {...field} readOnly className="bg-gray-50" />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>

                          <div className="mt-4 space-y-4">
                            <FormField
                              control={form.control}
                              name={`items.${index}.description`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Description</FormLabel>
                                  <FormControl>
                                    <Textarea {...field} placeholder="Detailed product description" />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={form.control}
                              name={`items.${index}.customization`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Customization</FormLabel>
                                  <FormControl>
                                    <Textarea {...field} placeholder="Special customization requirements" />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={form.control}
                              name={`items.${index}.productionNotes`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Production Notes</FormLabel>
                                  <FormControl>
                                    <Textarea {...field} placeholder="Internal production notes" />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={form.control}
                              name={`items.${index}.estimatedCompletionDate`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Estimated Completion Date</FormLabel>
                                  <FormControl>
                                    <Input {...field} type="date" />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Sidebar - Team Assignment & Notes */}
            <div className="space-y-6">
              {/* Team Assignment */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <User className="w-5 h-5 mr-2" />
                    Team Assignment
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="assignedDesignerId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Designer</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Auto-assign" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="">Auto-assign (recommended)</SelectItem>
                            {designers
                              .filter((member: any) => member.role === 'designer')
                              .map((designer: Designer) => (
                                <SelectItem key={designer.id} value={designer.id}>
                                  {designer.firstName} {designer.lastName} ({designer.activeOrders || 0} active)
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="space-y-2">
                    <FormLabel>Manufacturer</FormLabel>
                    <div className="space-y-2">
                      {selectedManufacturerId && manufacturers.length > 0 ? (
                        <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-md border border-green-200 dark:border-green-700">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center text-green-700 dark:text-green-300">
                              <Check className="w-4 h-4 mr-2" />
                              <span className="text-sm font-medium">
                                {manufacturers.find((m: Manufacturer) => m.id === selectedManufacturerId)?.company ||
                                 `${manufacturers.find((m: Manufacturer) => m.id === selectedManufacturerId)?.firstName} ${manufacturers.find((m: Manufacturer) => m.id === selectedManufacturerId)?.lastName}`}
                              </span>
                            </div>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => setShowManufacturerDialog(true)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setShowManufacturerDialog(true)}
                          className="w-full"
                        >
                          <Factory className="w-4 h-4 mr-2" />
                          Select Manufacturer
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Notes */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <FileText className="w-5 h-5 mr-2" />
                    Notes & Requirements
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Customer Notes</FormLabel>
                        <FormControl>
                          <Textarea {...field} placeholder="Notes visible to customer" rows={3} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="internalNotes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Internal Notes</FormLabel>
                        <FormControl>
                          <Textarea {...field} placeholder="Internal team notes" rows={3} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="customerRequirements"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Customer Requirements</FormLabel>
                        <FormControl>
                          <Textarea {...field} placeholder="Specific customer requirements" rows={3} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              {/* Delivery Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Calendar className="w-5 h-5 mr-2" />
                    Delivery Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="deliveryAddress"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Delivery Address</FormLabel>
                        <FormControl>
                          <Textarea {...field} placeholder="Full delivery address" rows={3} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="deliveryInstructions"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Delivery Instructions</FormLabel>
                        <FormControl>
                          <Textarea {...field} placeholder="Special delivery instructions" rows={2} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              {/* Production Images Upload */}
              {order && (
                <ProductionImageUploader
                  orderId={order.id}
                  taskType="production"
                  stage="in_progress"
                  onUploadSuccess={(images) => {
                    toast({
                      title: "Images uploaded",
                      description: `Successfully uploaded ${images.length} production images`
                    });
                  }}
                />
              )}

              {/* Production Timeline */}
              {order && (
                <ProductionImageTimeline
                  orderId={order.id}
                />
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-between items-center pt-6 border-t">
            <div className="flex space-x-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/orders')}
                disabled={saveMutation.isPending || isDeleting}
              >
                Cancel
              </Button>
              {order && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate(`/orders/timeline/${order.id}`)}
                  className="bg-purple-50 hover:bg-purple-100 border-purple-200 text-purple-700"
                >
                  <Activity className="w-4 h-4 mr-2" />
                  View Timeline
                </Button>
              )}
            </div>

            <div className="flex space-x-4">
              <Button
                type="submit"
                disabled={saveMutation.isPending || !validation.canSubmit || isSubmitDisabled || isDeleting}
                className={`bg-blue-600 hover:bg-blue-700 ${(!validation.canSubmit || isSubmitDisabled) ? "opacity-50 cursor-not-allowed" : ""}`}
                title={!validation.canSubmit ? 
                  (validation.errors.length > 0 ? "Please fix form errors" : "No changes to save") : 
                  isSubmitDisabled ? "Please wait before submitting again" :
                  "Save order changes"}
              >
                {saveMutation.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : isSubmitDisabled ? (
                  <Loader2 className="w-4 h-4 mr-2" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                {saveMutation.isPending ? 'Saving...' : isSubmitDisabled ? 'Processing...' : (isEditing ? 'Update Order' : 'Create Order')}
              </Button>

              {/* Delete Button - Only show for existing orders */}
              {isEditing && order && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => softDelete(order.id, order, order.orderNumber)}
                  disabled={saveMutation.isPending || isDeleting}
                  className="text-red-400 hover:bg-red-500/10 hover:text-red-300 border-red-400/30 hover:border-red-400"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  {isDeleting ? 'Deleting...' : 'Delete Order'}
                </Button>
              )}
            </div>
          </div>
        </form>
      </Form>

      {/* Manufacturer Selection Dialog */}
      <Dialog open={showManufacturerDialog} onOpenChange={setShowManufacturerDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Select Manufacturer</DialogTitle>
            <DialogDescription>
              Choose a manufacturer based on their capabilities and current workload
            </DialogDescription>
          </DialogHeader>
          
          <ScrollArea className="h-96">
            <div className="space-y-4 pr-4">
              {manufacturers.map((manufacturer: Manufacturer) => (
                <ManufacturerCard
                  key={manufacturer.id}
                  manufacturer={manufacturer}
                  onSelect={handleManufacturerSelect}
                  showSelectButton={true}
                  className={`transition-all ${
                    selectedManufacturerId === manufacturer.id 
                      ? 'ring-2 ring-blue-500 shadow-lg' 
                      : 'hover:shadow-md'
                  }`}
                />
              ))}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Order Audit History - Shows after order is saved */}
      {isEditing && (
        <div className="mt-6 bg-white rounded-lg">
          <OrderAuditHistory 
            orderId={orderId}
            className="border-0 shadow-sm"
          />
        </div>
      )}
    </div>
  );
}