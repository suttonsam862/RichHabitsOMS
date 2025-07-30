import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useFieldArray } from 'react-hook-form';
import { useSafeQuery } from '@/hooks/useSafeQuery';
import { useSafeMutation } from '@/hooks/useSafeMutation';
import { useSafeFormSubmission } from '@/hooks/useSafeFormSubmission';
import { useQuery, useMutation } from '@tanstack/react-query';
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Plus, Trash, ArrowLeft, Package, Search } from 'lucide-react';
import { apiRequest, getQueryFn } from '@/lib/queryClient';
import { queryKeys } from '@/lib/queryKeys';
import { useMutationSync } from '@/hooks/useDataSync';
import { z } from 'zod';

// Schema for order creation
const orderItemSchema = z.object({
  productName: z.string().min(1, 'Product name is required'),
  description: z.string().optional(),
  size: z.string().optional(),
  color: z.string().optional(),
  quantity: z.number().min(1, 'Quantity must be at least 1'),
  unitPrice: z.number().min(0, 'Unit price must be non-negative'),
  totalPrice: z.number().min(0, 'Total price must be non-negative'),
  catalogItemId: z.string().optional(), // Add catalog item reference
});

const orderFormSchema = z.object({
  orderNumber: z.string().min(1, 'Order number is required'),
  customerId: z.string().min(1, 'Customer is required'),
  status: z.string().default('draft'),
  notes: z.string().optional(),
  items: z.array(orderItemSchema).min(1, 'At least one item is required'),
});

type OrderFormValues = z.infer<typeof orderFormSchema>;

interface Customer {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

interface CatalogItem {
  id: string;
  name: string;
  sku: string;
  category: string;
  sport: string;
  basePrice: number;
  unitCost: number;
  etaDays: string;
  status: string;
  imageUrl?: string;
  hasMeasurements?: boolean;
}

interface CatalogItemsResponse {
  success: boolean;
  data: CatalogItem[];
}

export default function OrderCreatePage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { onCustomerSuccess, onCatalogSuccess, onOrderSuccess } = useMutationSync();
  
  // State for catalog integration
  const [showCatalogPicker, setShowCatalogPicker] = useState(false);
  const [selectedItemIndex, setSelectedItemIndex] = useState<number>(-1);

  // Fetch customers using standardized query keys
  const { data: customersResponse, error: customersError, isLoading: customersLoading } = useQuery({
    queryKey: queryKeys.customers.all,
    queryFn: getQueryFn({ on401: 'returnNull' }),
    retry: 2,
    retryDelay: 1000,
  });

  // Extract customers array with proper error handling
  const customers = React.useMemo(() => {
    if (!customersResponse) {
      return [];
    }
    
    // Handle different response structures
    if ((customersResponse as any).success && Array.isArray((customersResponse as any).data)) {
      return (customersResponse as any).data;
    }
    
    if ((customersResponse as any).customers && Array.isArray((customersResponse as any).customers)) {
      return (customersResponse as any).customers;
    }
    
    if (Array.isArray(customersResponse)) {
      return customersResponse;
    }
    
    return [];
  }, [customersResponse]);

  // Fetch catalog items using standardized query keys
  const { data: catalogResponse, isLoading: catalogLoading } = useQuery({
    queryKey: queryKeys.catalog.all,
    queryFn: getQueryFn({ on401: 'returnNull' }),
    retry: 2,
    retryDelay: 1000,
  });

  const catalogItems = React.useMemo(() => {
    // Handle different response structures from catalog API
    if (!catalogResponse) return [];
    
    // Check if response has success/data structure
    if ((catalogResponse as any).success && Array.isArray((catalogResponse as any).data)) {
      return (catalogResponse as any).data.filter((item: any) => item.status === 'active');
    }
    
    // Check if response is directly an array
    if (Array.isArray(catalogResponse)) {
      return (catalogResponse as any[]).filter((item: any) => item.status === 'active');
    }
    
    console.log('Unexpected catalog response structure:', catalogResponse);
    return [];
  }, [catalogResponse]);

  // Initialize the form
  const form = useForm<OrderFormValues>({
    resolver: zodResolver(orderFormSchema),
    defaultValues: {
      orderNumber: '',
      customerId: '',
      status: 'draft',
      notes: '',
      items: [
        {
          productName: '',
          description: '',
          size: '',
          color: '',
          quantity: 1,
          unitPrice: 0,
          totalPrice: 0,
          catalogItemId: '',
        },
      ],
    },
  });

  // Setup field array for line items
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'items',
  });

  // Generate order number on component mount
  useEffect(() => {
    const randomOrderNum = 'ORD' + Math.floor(100000 + Math.random() * 900000);
    form.setValue('orderNumber', randomOrderNum);
  }, [form]);

  // Create order mutation
  const createOrderMutation = useMutation({
    mutationFn: async (data: OrderFormValues) => {
      console.log('Creating order with data:', data);
      
      // Transform items to match controller expectations (snake_case fields)
      const items = data.items.map(item => ({
        product_name: item.productName,
        description: item.description || '',
        quantity: item.quantity,
        unit_price: item.unitPrice,
        total_price: item.quantity * item.unitPrice,
        color: item.color || '',
        size: item.size || ''
      }));

      // Calculate order totals
      const subtotal = items.reduce((sum, item) => sum + item.total_price, 0);
      const tax = subtotal * 0.08; // 8% tax rate - adjust as needed
      const total = subtotal + tax;

      const orderData = {
        customer_id: data.customerId,
        order_number: data.orderNumber,
        status: data.status,
        notes: data.notes || '',
        items: items,
        total_amount: total,
        tax: tax
      };

      console.log('Sending order data to API:', orderData);

      const response = await apiRequest('POST', '/api/orders/create', orderData);
      return response;
    },
    onSuccess: async (data) => {
      console.log('Order created successfully:', data);
      await onOrderSuccess(); // Use centralized cache invalidation
      toast({
        title: 'Success!',
        description: 'Order created successfully',
      });
      navigate('/orders');
    },
    onError: (error: any) => {
      console.error('Error creating order:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to create order. Please try again.',
        variant: 'destructive',
      });
    },
  });

  // Form submission handler
  function onSubmit(data: OrderFormValues) {
    console.log('Form submission data:', data);
    
    // Validate required fields
    if (!data.customerId) {
      toast({
        title: 'Error',
        description: 'Please select a customer before creating the order.',
        variant: 'destructive',
      });
      return;
    }

    if (!data.orderNumber) {
      toast({
        title: 'Error',
        description: 'Order number is required.',
        variant: 'destructive',
      });
      return;
    }

    // Validate at least 1 item is present
    if (!data.items || data.items.length === 0) {
      toast({
        title: 'Error',
        description: 'At least one item is required to create an order.',
        variant: 'destructive',
      });
      return;
    }

    // Check if at least one item has valid required fields
    const validItems = data.items.filter(item => 
      item.productName && 
      item.productName.trim() !== '' && 
      item.quantity > 0 && 
      item.unitPrice >= 0
    );

    if (validItems.length === 0) {
      toast({
        title: 'Error',
        description: 'Please add at least one valid item with product name, quantity, and price.',
        variant: 'destructive',
      });
      return;
    }

    // Additional validation: ensure only valid items are submitted
    const filteredData = {
      ...data,
      items: validItems
    };

    createOrderMutation.mutate(filteredData);
  }

  // Add item to order
  const addItem = () => {
    append({
      productName: '',
      description: '',
      size: '',
      color: '',
      quantity: 1,
      unitPrice: 0,
      totalPrice: 0,
      catalogItemId: '',
    });
  };

  // Add item from catalog
  const addCatalogItem = (catalogItem: CatalogItem) => {
    if (selectedItemIndex >= 0) {
      // Update existing item
      form.setValue(`items.${selectedItemIndex}.productName`, catalogItem.name);
      form.setValue(`items.${selectedItemIndex}.description`, `${catalogItem.category} - ${catalogItem.sport}`);
      form.setValue(`items.${selectedItemIndex}.unitPrice`, catalogItem.basePrice);
      form.setValue(`items.${selectedItemIndex}.catalogItemId`, catalogItem.id);
      
      // Calculate total price
      const quantity = form.getValues(`items.${selectedItemIndex}.quantity`) || 1;
      form.setValue(`items.${selectedItemIndex}.totalPrice`, quantity * catalogItem.basePrice);
    } else {
      // Add new item
      append({
        productName: catalogItem.name,
        description: `${catalogItem.category} - ${catalogItem.sport}`,
        size: '',
        color: '',
        quantity: 1,
        unitPrice: catalogItem.basePrice,
        totalPrice: catalogItem.basePrice,
        catalogItemId: catalogItem.id,
      });
    }
    
    setShowCatalogPicker(false);
    setSelectedItemIndex(-1);
    
    toast({
      title: "Catalog Item Added",
      description: `${catalogItem.name} has been added to the order.`,
    });
  };

  // Open catalog picker for specific item
  const openCatalogPicker = (index: number = -1) => {
    setSelectedItemIndex(index);
    setShowCatalogPicker(true);
  };

  // Calculate line item total
  const calculateLineTotal = (index: number) => {
    const quantity = form.watch(`items.${index}.quantity`) || 0;
    const unitPrice = form.watch(`items.${index}.unitPrice`) || 0;
    return quantity * unitPrice;
  };

  // Calculate order total
  const calculateOrderTotal = () => {
    let total = 0;
    fields.forEach((_, index) => {
      total += calculateLineTotal(index);
    });
    return total;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/orders')}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Orders
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Create New Order</h1>
            <p className="text-gray-600 mt-2">
              Create a new clothing order for a customer
            </p>
          </div>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          {/* Order Information */}
          <Card>
            <CardHeader>
              <CardTitle>Order Information</CardTitle>
              <CardDescription>
                Enter the basic information for this order
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="orderNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Order Number</FormLabel>
                      <FormControl>
                        <Input {...field} />
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
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a customer" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {customers.map((customer: any) => (
                            <SelectItem key={customer.id} value={customer.id.toString()}>
                              {customer.firstName && customer.lastName 
                                ? `${customer.firstName} ${customer.lastName}` 
                                : customer.email || `Customer ${customer.id}`}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Any special instructions or notes for this order"
                        className="resize-none"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Order Items */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Order Items</CardTitle>
                  <CardDescription>
                    Add the items for this order {customersLoading && "(Loading customers...)"}
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addItem}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Manual Item
                  </Button>
                  <Button
                    type="button"
                    variant="default"
                    size="sm"
                    onClick={() => openCatalogPicker()}
                    className="bg-neon-blue hover:bg-neon-blue/80"
                  >
                    <Package className="mr-2 h-4 w-4" />
                    Add from Catalog
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product Name</TableHead>
                      <TableHead>Fabric Description</TableHead>
                      <TableHead>Size</TableHead>
                      <TableHead>Color</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Unit Price</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {fields.map((field, index) => (
                      <TableRow key={field.id}>
                        <TableCell>
                          <FormField
                            control={form.control}
                            name={`items.${index}.productName`}
                            render={({ field }) => (
                              <FormItem>
                                <FormControl>
                                  <Input {...field} placeholder="Product name" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </TableCell>
                        <TableCell>
                          <FormField
                            control={form.control}
                            name={`items.${index}.description`}
                            render={({ field }) => (
                              <FormItem>
                                <FormControl>
                                  <Input {...field} placeholder="Fabric description" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </TableCell>
                        <TableCell>
                          <FormField
                            control={form.control}
                            name={`items.${index}.size`}
                            render={({ field }) => (
                              <FormItem>
                                <Select
                                  onValueChange={field.onChange}
                                  defaultValue={field.value}
                                  value={field.value}
                                >
                                  <FormControl>
                                    <SelectTrigger className="w-24">
                                      <SelectValue placeholder="Size" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="YS">YS</SelectItem>
                                    <SelectItem value="YM">YM</SelectItem>
                                    <SelectItem value="YL">YL</SelectItem>
                                    <SelectItem value="AXS">AXS</SelectItem>
                                    <SelectItem value="S">S</SelectItem>
                                    <SelectItem value="M">M</SelectItem>
                                    <SelectItem value="L">L</SelectItem>
                                    <SelectItem value="XL">XL</SelectItem>
                                    <SelectItem value="2XL">2XL</SelectItem>
                                    <SelectItem value="3XL">3XL</SelectItem>
                                    <SelectItem value="4XL">4XL</SelectItem>
                                    <SelectItem value="No Sizes">No Sizes</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </TableCell>
                        <TableCell>
                          <FormField
                            control={form.control}
                            name={`items.${index}.color`}
                            render={({ field }) => (
                              <FormItem>
                                <FormControl>
                                  <Input {...field} placeholder="Color" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </TableCell>
                        <TableCell>
                          <FormField
                            control={form.control}
                            name={`items.${index}.quantity`}
                            render={({ field }) => (
                              <FormItem>
                                <FormControl>
                                  <Input 
                                    {...field} 
                                    type="number" 
                                    min={1} 
                                    className="w-20"
                                    onChange={(e) => {
                                      field.onChange(parseInt(e.target.value) || 1);
                                      const value = parseInt(e.target.value) || 0;
                                      form.setValue(`items.${index}.totalPrice`, value * (form.getValues(`items.${index}.unitPrice`) || 0));
                                    }}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </TableCell>
                        <TableCell>
                          <FormField
                            control={form.control}
                            name={`items.${index}.unitPrice`}
                            render={({ field }) => (
                              <FormItem>
                                <FormControl>
                                  <Input 
                                    {...field} 
                                    type="number" 
                                    step="0.01" 
                                    min="0" 
                                    className="w-24"
                                    onChange={(e) => {
                                      field.onChange(parseFloat(e.target.value) || 0);
                                      const value = parseFloat(e.target.value) || 0;
                                      form.setValue(`items.${index}.totalPrice`, value * (form.getValues(`items.${index}.quantity`) || 0));
                                    }}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </TableCell>
                        <TableCell>
                          ${calculateLineTotal(index).toFixed(2)}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => openCatalogPicker(index)}
                              title="Select from Catalog"
                            >
                              <Package className="h-4 w-4" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                if (fields.length > 1) {
                                  remove(index);
                                } else {
                                  toast({
                                    title: 'Error',
                                    description: 'Cannot remove the last item. Orders must have at least one item.',
                                    variant: 'destructive',
                                  });
                                }
                              }}
                            >
                              <Trash className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              
              {/* Order Total */}
              <div className="mt-6 flex justify-end">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="text-lg font-semibold">
                    Order Total: ${calculateOrderTotal().toFixed(2)}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex justify-end space-x-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/orders')}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={createOrderMutation.isPending}
            >
              {createOrderMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Create Order
            </Button>
          </div>
        </form>
      </Form>

      {/* Catalog Picker Dialog */}
      <Dialog open={showCatalogPicker} onOpenChange={setShowCatalogPicker}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>Select Catalog Item</DialogTitle>
            <DialogDescription>
              Choose an item from the catalog to add to your order
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 overflow-y-auto max-h-[60vh]">
            {catalogLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-neon-blue mx-auto"></div>
                <p className="mt-2 text-sm text-gray-500">Loading catalog items...</p>
              </div>
            ) : catalogItems.length === 0 ? (
              <div className="text-center py-8">
                <Package className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No catalog items</h3>
                <p className="mt-1 text-sm text-gray-500">
                  No active catalog items are available.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {catalogItems.map((item: any) => (
                  <Card key={item.id} className="cursor-pointer hover:shadow-lg transition-shadow">
                    <CardContent className="p-4">
                      <div className="space-y-3">
                        <div className="flex justify-between items-start">
                          <h3 className="font-semibold text-lg truncate">{item.name}</h3>
                          <Badge variant="secondary">{item.category}</Badge>
                        </div>
                        
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-600">SKU:</span>
                            <span className="font-mono">{item.sku}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Sport:</span>
                            <span>{item.sport}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Price:</span>
                            <span className="font-semibold">${item.basePrice.toFixed(2)}</span>
                          </div>
                          {item.etaDays && (
                            <div className="flex justify-between">
                              <span className="text-gray-600">ETA:</span>
                              <span>{item.etaDays} days</span>
                            </div>
                          )}
                        </div>
                        
                        <Button
                          onClick={() => addCatalogItem(item)}
                          className="w-full mt-3"
                          size="sm"
                        >
                          Select Item
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}