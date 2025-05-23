import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useFieldArray } from 'react-hook-form';
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
import { useToast } from '@/hooks/use-toast';
import { Loader2, Plus, Trash, ArrowLeft } from 'lucide-react';
import { apiRequest, getQueryFn } from '@/lib/queryClient';
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

export default function OrderCreatePage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch customers for dropdown
  const { data: customers = [] } = useQuery<Customer[]>({
    queryKey: ['/api/customers'],
    queryFn: getQueryFn({ on401: 'throw' }),
  });

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
      
      // Calculate total price for each item
      const itemsWithTotals = data.items.map(item => ({
        ...item,
        totalPrice: item.quantity * item.unitPrice,
      }));

      const orderData = {
        orderNumber: data.orderNumber,
        customerId: data.customerId,
        status: data.status,
        notes: data.notes || '',
        items: itemsWithTotals,
        totalAmount: itemsWithTotals.reduce((sum, item) => sum + item.totalPrice, 0),
      };

      console.log('Sending order data to API:', orderData);

      const response = await apiRequest('POST', '/api/orders', orderData);
      return response;
    },
    onSuccess: (data) => {
      console.log('Order created successfully:', data);
      queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
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

    // Check if at least one item has required fields
    const hasValidItems = data.items.some(item => 
      item.productName && item.quantity > 0 && item.unitPrice >= 0
    );

    if (!hasValidItems) {
      toast({
        title: 'Error',
        description: 'Please add at least one valid item to the order.',
        variant: 'destructive',
      });
      return;
    }

    createOrderMutation.mutate(data);
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
    });
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
                    Add the items for this order
                  </CardDescription>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addItem}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Item
                </Button>
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
                      <TableHead></TableHead>
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
    </div>
  );
}