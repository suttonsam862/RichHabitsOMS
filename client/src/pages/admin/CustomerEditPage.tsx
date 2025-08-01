import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Save, AlertTriangle } from "lucide-react";
import { UserAvatar } from '@/components/ui/FallbackImage';
import { useToast } from "@/hooks/use-toast";
import { useFormValidation } from "@/hooks/useFormValidation";
import { useFormNavigationBlock } from "@/hooks/useFormNavigationBlock";
import { useFieldValidation } from "@/hooks/useFieldValidation";
import { getFieldStyles } from "@/lib/utils";
import { CustomerPhotoUpload } from '@/components/ui/CustomerPhotoUpload';

const customerSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().optional(),
  company: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zip: z.string().optional(),
  country: z.string().optional(),
  status: z.enum(['active', 'inactive', 'suspended'])
});

type CustomerFormData = z.infer<typeof customerSchema>;

interface Customer extends CustomerFormData {
  id: string;
  orders: number;
  spent: string;
  lastOrder?: string;
  created_at: string;
  photo_url?: string;
  profile_image_url?: string;
}

export default function CustomerEditPage() {
  const { customerId } = useParams<{ customerId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Local state management
  const [customer, setCustomer] = React.useState<Customer | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSaving, setIsSaving] = React.useState(false);
  const [customerError, setCustomerError] = React.useState<string | null>(null);

  // Fetch customer data with simple async/await
  const fetchCustomer = async () => {
    if (!customerId) return;
    
    setIsLoading(true);
    setCustomerError(null);
    
    try {
      const response = await fetch(`/api/customers/${customerId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        const errorMessage = errorData?.message || `Failed to fetch customer details (${response.status})`;
        throw new Error(errorMessage);
      }

      const data = await response.json();

      // Convert snake_case response to camelCase for frontend
      const customerData = {
        id: data.id,
        firstName: data.first_name || data.firstName || '',
        lastName: data.last_name || data.lastName || '',
        email: data.email || '',
        phone: data.phone || '',
        company: data.company || '',
        address: data.address || '',
        city: data.city || '',
        state: data.state || '',
        zip: data.zip || '',
        country: data.country || '',
        status: data.status || 'active',
        orders: data.orders || 0,
        spent: data.spent || '0',
        lastOrder: data.lastOrder || data.last_order,
        created_at: data.created_at,
        photo_url: data.photo_url,
        profile_image_url: data.profile_image_url
      } as Customer;
      
      setCustomer(customerData);
    } catch (error: any) {
      const errorMessage = error.name === 'TypeError' || error.message.includes('fetch')
        ? 'Network error. Please check your connection and try again.'
        : error.message;
      setCustomerError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Load customer data on mount
  React.useEffect(() => {
    fetchCustomer();
  }, [customerId]);

  const form = useForm<CustomerFormData>({
    resolver: zodResolver(customerSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      company: '',
      address: '',
      city: '',
      state: '',
      zip: '',
      country: '',
      status: 'active'
    }
  });

  const [initialData, setInitialData] = React.useState<CustomerFormData | null>(null);

  // Update form when customer data loads
  React.useEffect(() => {
    if (customer) {
      const formData = {
        firstName: customer.firstName || '',
        lastName: customer.lastName || '',
        email: customer.email || '',
        phone: customer.phone || '',
        company: customer.company || '',
        address: customer.address || '',
        city: customer.city || '',
        state: customer.state || '',
        zip: customer.zip || '',
        country: customer.country || '',
        status: customer.status as 'active' | 'inactive' | 'suspended' || 'active'
      };
      form.reset(formData);
      setInitialData(formData);
    }
  }, [customer, form]);

  // Form validation hook
  const validation = useFormValidation({
    form,
    initialData,
    requiredFields: ['firstName', 'lastName', 'email'],
    ignoreFields: [] // Include all fields in change detection
  });

  // Block navigation during form submission
  useFormNavigationBlock({
    when: validation.hasChanges || isSaving,
    message: "Your form is being saved. Please wait for the process to complete before leaving."
  });

  // Real-time field validation
  const fieldValidation = useFieldValidation({
    form,
    realtimeFields: ['email', 'phone'] // Validate these fields in real-time after blur
  });

  const [submitError, setSubmitError] = React.useState<string | null>(null);

  // Simple customer update with async/await
  const updateCustomer = async (data: CustomerFormData) => {
    // Clear any previous errors
    setSubmitError(null);

    // Ensure we have a valid customer ID
    if (!customerId) {
      throw new Error('Customer ID is required');
    }

    // Convert camelCase fields to snake_case for the API
    const requestData = {
      first_name: data.firstName,
      last_name: data.lastName,
      email: data.email,
      phone: data.phone || '',
      company: data.company || '',
      address: data.address || '',
      city: data.city || '',
      state: data.state || '',
      zip: data.zip || '',
      country: data.country || '',
      status: data.status
    };

    console.log(`Updating customer with ID: ${customerId}`, requestData);

    try {
      const response = await fetch(`/api/customers/${customerId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify(requestData)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        let errorMessage = 'Failed to update customer';
        
        if (errorData?.message) {
          errorMessage = errorData.message;
        } else if (response.status === 404) {
          errorMessage = 'Customer not found';
        } else if (response.status === 400) {
          errorMessage = 'Invalid customer data provided';
        } else if (response.status === 401) {
          errorMessage = 'Authentication failed. Please refresh the page and try again.';
        } else if (response.status >= 500) {
          errorMessage = 'Server error. Please try again later.';
        }
        
        throw new Error(errorMessage);
      }

      return response.json();
    } catch (error: any) {
      if (error.name === 'TypeError' || error.message.includes('fetch')) {
        throw new Error('Network error. Please check your connection and try again.');
      }
      throw error;
    }
  };

  const onSubmit = async (data: CustomerFormData) => {
    if (isSaving) return;
    
    setIsSaving(true);
    setSubmitError(null);

    try {
      await updateCustomer(data);
      
      toast({
        title: "Customer updated successfully",
        description: "Customer information has been saved.",
      });

      // Refresh customer data to get the latest information
      await fetchCustomer();
      
      // Reset form state
      setInitialData(data);
    } catch (error: any) {
      console.error('Customer update error:', error);
      setSubmitError(error.message);
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update customer. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Show loading state
  if (isLoading) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center space-x-4 mb-6">
          <Button variant="ghost" onClick={() => navigate('/admin/customers')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Customers
          </Button>
        </div>
        <Card>
          <CardHeader>
            <div className="space-y-2">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-4 w-48" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-10 w-full" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-10 w-full" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-12" />
                <Skeleton className="h-10 w-full" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-10 w-full" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-10 w-full" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-10 w-full" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-10 w-full" />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4 pt-4">
              <Skeleton className="h-10 w-32" />
              <Skeleton className="h-10 w-20" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show error state
  if (customerError && !isLoading) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center space-x-4 mb-6">
          <Button variant="ghost" onClick={() => navigate('/admin/customers')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Customers
          </Button>
        </div>
        <Card>
          <CardContent className="py-16 text-center">
            <div className="mb-4">
              <AlertTriangle className="h-16 w-16 text-destructive mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">Failed to Load Customer</h3>
              <p className="text-muted-foreground mb-4">
                {customerError || 'Unable to fetch customer details. Please try again.'}
              </p>
              <Button 
                onClick={() => window.location.reload()} 
                variant="outline"
                className="mr-2"
              >
                Try Again
              </Button>
              <Button 
                onClick={() => navigate('/admin/customers')} 
                variant="default"
              >
                Back to Customers
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center space-x-4 mb-6">
          <Button variant="ghost" onClick={() => navigate('/admin/customers')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Customers
          </Button>
        </div>
        <Card>
          <CardContent className="py-16 text-center">
            <h3 className="text-lg font-medium mb-2">Customer not found</h3>
            <p className="text-muted-foreground">The customer you're trying to edit doesn't exist.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6">
      <div className="flex items-center space-x-4 mb-6">
        <Button variant="ghost" onClick={() => navigate(`/admin/customers/${customerId}`)}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Customer
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Edit Customer</h1>
          <p className="text-muted-foreground">{customer.firstName} {customer.lastName}</p>
          {customer?.created_at && (
            <p className="text-sm text-muted-foreground">
              Created: {new Date(customer.created_at).toLocaleString()}
            </p>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Customer Information</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>First Name</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="First name" 
                          {...field} 
                          className={getFieldStyles('firstName', validation.changedFields, !!form.formState.errors.firstName)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Last Name</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Last name" 
                          {...field} 
                          className={getFieldStyles('lastName', validation.changedFields, !!form.formState.errors.lastName)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Email address" 
                        type="email" 
                        {...field} 
                        className={getFieldStyles('email', validation.changedFields, !!form.formState.errors.email)}
                        onBlur={(e) => {
                          field.onBlur();
                          fieldValidation.validateField('email', e.target.value);
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Phone number" 
                          {...field} 
                          className={getFieldStyles('phone', validation.changedFields, !!form.formState.errors.phone)}
                          onBlur={(e) => {
                            field.onBlur();
                            fieldValidation.validateField('phone', e.target.value);
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="company"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Company</FormLabel>
                      <FormControl>
                        <Input placeholder="Company name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Customer Photo Upload */}
              <div className="col-span-2">
                <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg bg-gray-50">
                  <div className="flex items-center space-x-4">
                    <UserAvatar
                      src={customer?.photo_url || customer?.profile_image_url}
                      name={`${customer?.firstName} ${customer?.lastName}`}
                      className="h-16 w-16"
                    />
                    <div>
                      <h3 className="font-medium text-gray-900">Customer Photo</h3>
                      <p className="text-sm text-gray-500">
                        {customer?.photo_url || customer?.profile_image_url 
                          ? 'Photo uploaded' 
                          : 'No photo uploaded'
                        }
                      </p>
                    </div>
                  </div>
                  <CustomerPhotoUpload
                    customerId={customerId!}
                    currentPhotoUrl={customer?.photo_url || customer?.profile_image_url}
                    customerName={`${customer?.firstName} ${customer?.lastName}`}
                    onUploadSuccess={(photoUrl) => {
                      // Update the customer data with new photo URL
                      if (customer) {
                        setCustomer({ ...customer, photo_url: photoUrl });
                      }
                    }}
                  />
                </div>
              </div>

              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Address</FormLabel>
                    <FormControl>
                      <Input placeholder="Street address" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>City</FormLabel>
                      <FormControl>
                        <Input placeholder="City" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="state"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>State</FormLabel>
                      <FormControl>
                        <Input placeholder="State" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="zip"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>ZIP Code</FormLabel>
                      <FormControl>
                        <Input placeholder="ZIP code" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="country"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Country</FormLabel>
                    <FormControl>
                      <Input placeholder="Country" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select customer status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                        <SelectItem value="suspended">Suspended</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Submit Error */}
              {submitError && (
                <div className="bg-red-50 border border-red-200 rounded-md p-3">
                  <div className="flex items-center space-x-2">
                    <AlertTriangle className="h-4 w-4 text-red-600" />
                    <p className="text-sm text-red-700">{submitError}</p>
                  </div>
                </div>
              )}

              {/* Validation Status */}
              {!validation.canSubmit && validation.hasChanges && (
                <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                  <div className="flex items-center space-x-2">
                    <svg className="h-4 w-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-sm text-blue-700">
                      No changes to save
                    </p>
                  </div>
                </div>
              )}

              {validation.errors.length > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
                  <div className="flex items-center space-x-2">
                    <svg className="h-4 w-4 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 15.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                    <div>
                      <p className="text-sm text-yellow-700 font-medium">Please fix the following:</p>
                      <ul className="text-sm text-yellow-700 ml-4 mt-1 list-disc">
                        {validation.missingRequiredFields.map(field => (
                          <li key={field}>{field} is required</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-end space-x-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => navigate(`/admin/customers/${customerId}`)}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={isSaving || !validation.canSubmit}
                  className={(!validation.canSubmit) ? "opacity-50 cursor-not-allowed" : ""}
                  title={!validation.canSubmit ? 
                    (validation.errors.length > 0 ? "Please fix form errors" : "No changes to save") : 
                    "Save customer changes"}
                >
                  <Save className="h-4 w-4 mr-2" />
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}