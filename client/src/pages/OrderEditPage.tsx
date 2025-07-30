import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
import ManufacturerCard from '@/components/ManufacturerCard';
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
  X
} from 'lucide-react';
import { apiRequest, getQueryFn } from '@/lib/queryClient';
import { useSmartFetch } from '@/hooks/useSmartFetch';

// Enhanced schema for order editing
const orderItemSchema = z.object({
  id: z.string().optional(),
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
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showManufacturerDialog, setShowManufacturerDialog] = useState(false);
  const [selectedManufacturerId, setSelectedManufacturerId] = useState<string>('');

  const isEditing = id !== 'new';

  // Fetch order data
  const { data: order, isLoading: orderLoading } = useQuery({
    queryKey: [`/api/orders/${id}`],
    queryFn: getQueryFn,
    enabled: isEditing,
  });

  // Fetch customers
  const { data: customers = [], isLoading: customersLoading } = useSmartFetch({
    endpoint: '/api/customers',
    enablePolling: false,
    maxRetries: 0,
    staleTime: 600000,
  });

  // Fetch manufacturers
  const { data: manufacturers = [], isLoading: manufacturersLoading } = useSmartFetch({
    endpoint: '/api/manufacturing/manufacturers',
    enablePolling: false,
    maxRetries: 0,
    staleTime: 600000,
  });

  // Fetch designers
  const { data: designers = [], isLoading: designersLoading } = useSmartFetch({
    endpoint: '/api/team/workload',
    enablePolling: false,
    maxRetries: 0,
    staleTime: 600000,
  });

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
      setSelectedManufacturerId(order.assignedManufacturerId || '');
    } else if (!isEditing) {
      // Generate order number for new orders
      const timestamp = Date.now().toString().slice(-8);
      const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
      form.setValue('orderNumber', `ORD-${timestamp}-${random}`);
    }
  }, [order, isEditing, form]);

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

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async (data: OrderEditFormValues) => {
      const endpoint = isEditing ? `/api/orders/${id}` : '/api/orders/create';
      const method = isEditing ? 'PATCH' : 'POST';

      // Transform data for API
      const transformedData = {
        ...data,
        items: data.items.map(item => ({
          ...item,
          product_name: item.productName,
          unit_price: item.unitPrice,
          total_price: item.totalPrice,
          production_notes: item.productionNotes,
          estimated_completion_date: item.estimatedCompletionDate,
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
    },
    onSuccess: (result) => {
      toast({
        title: 'Order Saved',
        description: `Order ${form.getValues('orderNumber')} has been ${isEditing ? 'updated' : 'created'} successfully.`,
      });
      
      queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
      if (isEditing) {
        queryClient.invalidateQueries({ queryKey: [`/api/orders/${id}`] });
      }
      
      // Navigate to order list or detail page
      navigate('/orders');
    },
    onError: (error: Error) => {
      toast({
        title: 'Save Failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const onSubmit = (data: OrderEditFormValues) => {
    saveMutation.mutate(data);
  };

  if (orderLoading || customersLoading || manufacturersLoading || designersLoading) {
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
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-4 pt-6 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/orders')}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={saveMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {saveMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              <Save className="w-4 h-4 mr-2" />
              {isEditing ? 'Update Order' : 'Create Order'}
            </Button>
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
    </div>
  );
}