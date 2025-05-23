import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useFieldArray } from 'react-hook-form';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormDescription,
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
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Plus, Trash } from 'lucide-react';
import { apiRequest, getQueryFn } from '@/lib/queryClient';
import { orderFormSchema, orderItemSchema, OrderFormValues, Customer, Order } from '@/types';

export default function OrderEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isEditing = !!id && id !== 'new';

  // Fetch customers for dropdown
  const { data: customers = [] } = useQuery<Customer[]>({
    queryKey: ['/api/customers'],
    queryFn: getQueryFn({ on401: 'throw' }),
  });

  // Fetch order data if editing
  const { data: order, isLoading: isLoadingOrder } = useQuery<Order>({
    queryKey: [`/api/orders/${id}`],
    queryFn: getQueryFn({ on401: 'throw' }),
    enabled: isEditing,
  });

  // Initialize the form
  const form = useForm<OrderFormValues>({
    resolver: zodResolver(orderFormSchema),
    defaultValues: {
      orderNumber: '',
      customerId: undefined,
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

  // Update form when order data is loaded
  useEffect(() => {
    if (order && isEditing) {
      const formattedItems = order.items.map(item => ({
        id: item.id,
        productName: item.productName,
        description: item.description || '',
        size: item.size || '',
        color: item.color || '',
        quantity: item.quantity,
        unitPrice: typeof item.unitPrice === 'string' ? parseFloat(item.unitPrice) : item.unitPrice,
        totalPrice: typeof item.totalPrice === 'string' ? parseFloat(item.totalPrice) : item.totalPrice,
      }));

      form.reset({
        orderNumber: order.orderNumber,
        customerId: order.customerId,
        status: order.status,
        notes: order.notes || '',
        items: formattedItems.length > 0 ? formattedItems : [{
          productName: '',
          description: '',
          size: '',
          color: '',
          quantity: 1,
          unitPrice: 0,
          totalPrice: 0,
        }],
      });
    } else if (!isEditing) {
      // Generate a random order number for new orders
      const randomOrderNum = 'ORD' + Math.floor(100000 + Math.random() * 900000);
      form.setValue('orderNumber', randomOrderNum);
    }
  }, [order, isEditing, form]);

  // Create mutation
  const createOrderMutation = useMutation({
    mutationFn: (data: OrderFormValues) => {
      // Calculate total price for each item
      const itemsWithTotals = data.items.map(item => ({
        ...item,
        totalPrice: item.quantity * item.unitPrice,
      }));

      return apiRequest('POST', '/api/orders', {
        ...data,
        items: itemsWithTotals,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
      toast({
        title: 'Success',
        description: 'Order created successfully',
      });
      navigate('/orders');
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Failed to create order. Please try again.',
      });
      console.error('Error creating order:', error);
    },
  });

  // Update mutation
  const updateOrderMutation = useMutation({
    mutationFn: (data: OrderFormValues) => {
      // Calculate total price for each item
      const itemsWithTotals = data.items.map(item => ({
        ...item,
        totalPrice: item.quantity * item.unitPrice,
      }));

      return apiRequest('PUT', `/api/orders/${id}`, {
        ...data,
        items: itemsWithTotals,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/orders/${id}`] });
      queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
      toast({
        title: 'Success',
        description: 'Order updated successfully',
      });
      navigate('/orders');
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Failed to update order. Please try again.',
      });
      console.error('Error updating order:', error);
    },
  });

  // Form submission handler
  function onSubmit(data: OrderFormValues) {
    if (isEditing) {
      updateOrderMutation.mutate(data);
    } else {
      createOrderMutation.mutate(data);
    }
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
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          {isEditing ? 'Edit Order' : 'Create New Order'}
        </h1>
        <p className="text-muted-foreground">
          {isEditing ? 'Update order details and items' : 'Create a new customer order'}
        </p>
      </div>

      {(isLoadingOrder && isEditing) ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
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
                          defaultValue={field.value?.toString()}
                          value={field.value?.toString()}
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
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select order status" />
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

            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>Order Items</CardTitle>
                    <CardDescription>
                      Add the products or services for this order
                    </CardDescription>
                  </div>
                  <Button type="button" onClick={addItem} variant="outline">
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
                        <TableHead>Description</TableHead>
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
                                    <Input {...field} placeholder="Description" />
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
                                  <FormControl>
                                    <Input {...field} placeholder="Size" />
                                  </FormControl>
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
                                        field.onChange(e);
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
                                        field.onChange(e);
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
                
                <div className="mt-4 flex justify-end">
                  <div className="w-64 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Subtotal:</span>
                      <span>${calculateOrderTotal().toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Tax (8%):</span>
                      <span>${(calculateOrderTotal() * 0.08).toFixed(2)}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between font-medium">
                      <span>Total:</span>
                      <span>${(calculateOrderTotal() * 1.08).toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate('/orders')}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={createOrderMutation.isPending || updateOrderMutation.isPending}
                >
                  {(createOrderMutation.isPending || updateOrderMutation.isPending) && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  {isEditing ? 'Update Order' : 'Create Order'}
                </Button>
              </CardFooter>
            </Card>
          </form>
        </Form>
      )}
    </div>
  );
}