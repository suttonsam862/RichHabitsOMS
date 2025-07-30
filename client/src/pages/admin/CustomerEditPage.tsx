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
import { ArrowLeft, Save, Upload, X, User } from "lucide-react";
import { UserAvatar } from '@/components/ui/FallbackImage';
import { useToast } from "@/hooks/use-toast";
import { useFormValidation } from "@/hooks/useFormValidation";
import { useFormNavigationBlock } from "@/hooks/useFormNavigationBlock";
import { useFieldValidation } from "@/hooks/useFieldValidation";
import { getFieldStyles } from "@/lib/utils";
import { validateFile } from '@/utils/fileValidation';
import { compressImage, shouldCompress, getCompressionSettings, formatFileSize } from '@/utils/imageCompression';

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

  // Photo upload state
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);
  const [isUploading, setIsUploading] = React.useState(false);
  const [uploadRetryCount, setUploadRetryCount] = React.useState(0);

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

  // Store initial data for comparison
  const [initialData, setInitialData] = React.useState<CustomerFormData | undefined>(undefined);

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
    when: validation.isSubmitDisabled || isSaving,
    message: "Your form is being saved. Please wait for the process to complete before leaving."
  });

  // Real-time field validation
  const fieldValidation = useFieldValidation({
    form,
    realtimeFields: ['email', 'phone'] // Validate these fields in real-time after blur
  });

  // File handling functions
  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Use centralized validation
      const validation = validateFile(file);
      if (!validation.isValid) {
        toast({
          title: "Invalid file",
          description: validation.error || 'Please select a valid image file.',
          variant: "destructive",
        });
        return;
      }

      let fileToUse = file;

      // Compress image if needed
      if (shouldCompress(file, 1024)) {
        try {
          const settings = getCompressionSettings(file.size / 1024);
          const result = await compressImage(file, settings);
          fileToUse = result.file;

          console.log(`Customer photo compressed: ${formatFileSize(result.originalSize)} → ${formatFileSize(result.compressedSize)} (${result.compressionRatio}% reduction)`);

          toast({
            title: "Image optimized",
            description: `File size reduced by ${result.compressionRatio}% for faster upload`,
          });
        } catch (error) {
          console.warn('Image compression failed, using original:', error);
        }
      }

      setSelectedFile(fileToUse);

      // Create preview URL using createObjectURL for better memory management
      const objectUrl = URL.createObjectURL(fileToUse);
      setPreviewUrl(objectUrl);
    }
  };

  const handleFileRemove = () => {
    setSelectedFile(null);
    // Clean up preview URL to prevent memory leaks
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
    setUploadRetryCount(0);
    // Reset file input
    const fileInput = document.getElementById('photo-upload') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  };

  // Simple photo upload with async/await
  const uploadPhoto = async (file: File) => {
    try {
      const formData = new FormData();
      formData.append('image', file);

      const response = await fetch(`/api/customers/${customerId}/photo`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        let errorMessage = 'Failed to upload photo';
        
        if (errorData?.message) {
          errorMessage = errorData.message;
        } else if (response.status === 413) {
          errorMessage = 'File size too large. Please choose a smaller image.';
        } else if (response.status === 415) {
          errorMessage = 'Invalid file format. Please upload a valid image file.';
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

  const handlePhotoUpload = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    try {
      await uploadPhoto(selectedFile);
      
      toast({
        title: "Photo uploaded",
        description: "Customer photo has been successfully uploaded.",
      });
      
      // Refresh customer data to get the new photo URL
      await fetchCustomer();
      
      // Clear the upload state
      setSelectedFile(null);
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
      setPreviewUrl(null);
      setUploadRetryCount(0);
    } catch (error: any) {
      setUploadRetryCount(prev => prev + 1);
      toast({
        title: "Upload failed",
        description: error.message || "Failed to upload customer photo.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const retryPhotoUpload = () => {
    if (!selectedFile) return;
    handlePhotoUpload();
  };

  // Cleanup preview URL on component unmount
  React.useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const [submitError, setSubmitError] = React.useState<string | null>(null);
  const [isSubmitDisabled, setIsSubmitDisabled] = React.useState(false);

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

      // Handle different types of failures
      if (!response.ok) {
        let errorMessage = `Failed to update customer (${response.status})`;

        try {
          const errorData = await response.json();
          if (errorData.message) {
            errorMessage = errorData.message;
          } else if (errorData.error) {
            errorMessage = errorData.error;
          }
        } catch (jsonError) {
          // If we can't parse JSON, use the status-based message
          if (response.status === 400) {
            errorMessage = 'Invalid customer data provided';
          } else if (response.status === 401) {
            errorMessage = 'Authentication required. Please log in again.';
          } else if (response.status === 403) {
            errorMessage = 'You do not have permission to update this customer';
          } else if (response.status === 404) {
            errorMessage = 'Customer not found';
          } else if (response.status >= 500) {
            errorMessage = 'Server error. Please try again later.';
          }
        }

        const error = new Error(errorMessage);
        error.name = `HTTPError${response.status}`;
        throw error;
      }

      const result = await response.json();

      // Validate the response structure
      if (!result.success || !result.updatedCustomer) {
        throw new Error('Invalid response format from server');
      }

      return result;
    } catch (networkError: any) {
      // Handle network errors (no internet, server down, etc.)
      if (networkError.name === 'TypeError' || networkError.message.includes('fetch')) {
        throw new Error('Network error. Please check your connection and try again.');
      }
      throw networkError;
    }
  };

  // Form submission handler with async/await
  const onSubmit = async (data: CustomerFormData) => {
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
      const result = await updateCustomer(data);
      
      console.log('Customer updated successfully:', result);
      
      // Clear any previous errors
      setSubmitError(null);

      // Only show success toast if API response indicates success
      if (result && result.success === true) {
        toast({
          title: "Customer updated",
          description: "Customer information has been successfully updated.",
        });

        // Update form values to reflect server response (in case server modified data)
        if (result.updatedCustomer) {
          const updatedCustomer = result.updatedCustomer;
          const formData = {
            firstName: updatedCustomer.firstName || updatedCustomer.first_name || '',
            lastName: updatedCustomer.lastName || updatedCustomer.last_name || '',
            email: updatedCustomer.email || '',
            company: updatedCustomer.company || '',
            phone: updatedCustomer.phone || '',
            address: updatedCustomer.address || '',
            city: updatedCustomer.city || '',
            state: updatedCustomer.state || '',
            zip: updatedCustomer.zip || '',
            country: updatedCustomer.country || '',
            status: updatedCustomer.status || 'active'
          };
          
          form.reset(formData);
          setInitialData(formData);
          
          // Update the local customer state
          setCustomer(prev => prev ? { ...prev, ...updatedCustomer } : null);
        }

        // Navigate back to customer detail page
        navigate(`/admin/customers/${customerId}`);
      } else {
        // If success is not true, treat it as an error
        const errorMessage = result?.message || 'Update completed but server did not confirm success';
        setSubmitError(errorMessage);
        toast({
          title: "Update uncertain",
          description: errorMessage,
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error('Customer update failed:', error);

      // Set the inline error message
      setSubmitError(error.message);

      // Also show toast for immediate feedback
      toast({
        title: "Update failed",
        description: error.message || "Failed to update customer information.",
        variant: "destructive",
      });

      // If it's an auth error, redirect to login
      if (error.name === 'HTTPError401') {
        localStorage.removeItem('authToken');
        navigate('/login');
      }
    } finally {
      setIsSaving(false);
      // Re-enable submit after 1 second
      setTimeout(() => setIsSubmitDisabled(false), 1000);
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center space-x-4 mb-6">
          <Button variant="ghost" onClick={() => navigate('/admin/customers')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Customers
          </Button>
        </div>

        {/* Header Skeleton */}
        <div className="mb-6">
          <Skeleton className="h-8 w-64 mb-2" />
          <Skeleton className="h-4 w-48" />
        </div>

        {/* Main Content Skeleton */}
        <div className="grid gap-6 md:grid-cols-3">
          {/* Profile Photo Section */}
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-center">
                <Skeleton className="h-32 w-32 rounded-full" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-4 w-40 mx-auto" />
              </div>
            </CardContent>
          </Card>

          {/* Customer Details Form */}
          <Card className="md:col-span-2">
            <CardHeader>
              <Skeleton className="h-6 w-48" />
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Personal Information */}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-20" />
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
                <div className="space-y-2">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-10 w-full" />
                </div>
              </div>

              {/* Contact Information */}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-10 w-full" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-10 w-full" />
                </div>
              </div>

              {/* Address Information */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-10 w-full" />
                </div>
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-12" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-14" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-10 w-full" />
                  </div>
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
                {customerError.message || 'Unable to fetch customer details. Please try again.'}
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
          {customer?.updated_at && (
            <p className="text-sm text-muted-foreground">
              Last updated: {new Date(customer.updated_at).toLocaleString()}
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
                        type="email" 
                        placeholder="email@example.com" 
                        {...field} 
                        onBlur={() => fieldValidation.handleEmailBlur('email')}
                        className={`${getFieldStyles('email', validation.changedFields, !!form.formState.errors.email)} ${fieldValidation.getFieldClasses('email')}`}
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
                          onBlur={() => fieldValidation.handleFieldBlur('phone')}
                          className={fieldValidation.getFieldClasses('phone')}
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

              {/* Photo Upload Section */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Customer Photo</h3>

                {/* Current Photo Display */}
                <div className="flex items-center space-x-4">
                  <div className="flex-shrink-0">
                    <UserAvatar
                      src={customer.profile_image_url || customer.photo_url}
                      name={`${customer.firstName} ${customer.lastName}`}
                      size="lg"
                    />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-muted-foreground">
                      {(customer.profile_image_url || customer.photo_url) ? 'Current customer photo' : 'No photo uploaded'}
                    </p>
                    {customer.profile_image_url && (
                      <p className="text-xs text-green-600 mt-1">✓ Stored in Supabase Storage</p>
                    )}
                  </div>
                </div>

                {/* Photo Upload Interface */}
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
                  {previewUrl ? (
                    <div className="text-center space-y-4">
                      <img
                        src={previewUrl}
                        alt="Preview"
                        className="mx-auto w-32 h-32 rounded-full object-cover border border-gray-200"
                      />

                      {/* Upload Error with Retry */}
                      {uploadPhotoMutation.isError && (
                        <div className="p-3 bg-red-50 border border-red-200 rounded-md space-y-2">
                          <p className="text-sm text-red-600">
                            {uploadPhotoMutation.error?.message || 'Upload failed'}
                          </p>
                          {uploadRetryCount < 3 && (
                            <div className="flex justify-center gap-2">
                              <Button
                                type="button"
                                onClick={retryPhotoUpload}
                                disabled={isUploading || uploadPhotoMutation.isPending}
                                variant="outline"
                                size="sm"
                                className="text-red-600 border-red-300 hover:bg-red-50"
                              >
                                Retry Upload
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={handleFileRemove}
                                className="text-gray-600"
                              >
                                Reset
                              </Button>
                            </div>
                          )}
                          {uploadRetryCount >= 3 && (
                            <p className="text-xs text-red-500">
                              Maximum retry attempts reached. Please check your connection and try again later.
                            </p>
                          )}
                        </div>
                      )}

                      {/* Upload Buttons */}
                      {!uploadPhotoMutation.isError && (
                        <div className="flex justify-center space-x-2">
                          <Button
                            type="button"
                            onClick={handlePhotoUpload}
                            disabled={isUploading || uploadPhotoMutation.isPending}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <Upload className="w-4 h-4 mr-2" />
                            {isUploading || uploadPhotoMutation.isPending ? 'Uploading...' : 'Upload Photo'}
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={handleFileRemove}
                            disabled={isUploading || uploadPhotoMutation.isPending}
                          >
                            <X className="w-4 h-4 mr-2" />
                            Remove
                          </Button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center">
                      <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                      <div className="flex flex-col items-center">
                        <label
                          htmlFor="photo-upload"
                          className="cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500"
                        >
                          <span>Upload a photo</span>
                          <input
                            id="photo-upload"
                            name="photo-upload"
                            type="file"
                            className="sr-only"
                            accept="image/jpeg,image/jpg,image/png,image/webp"
                            onChange={handleFileSelect}
                          />
                        </label>
                        <p className="pl-1 text-gray-500">or drag and drop</p>
                      </div>
                      <p className="text-xs text-gray-500 mt-2">
                        PNG, JPG, WebP up to 5MB
                      </p>
                    </div>
                  )}
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                            <SelectValue placeholder="Select status" />
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
              </div>

              {/* Inline error message */}
              {submitError && (
                <div className="bg-destructive/15 border border-destructive/50 rounded-md p-3">
                  <div className="flex items-center space-x-2">
                    <svg className="h-4 w-4 text-destructive" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-sm text-destructive font-medium">
                      {submitError}
                    </p>
                  </div>
                </div>
              )}

              {/* Validation Status */}
              {!validation.hasChanges && initialData && (
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
                  disabled={isSaving || !validation.canSubmit || isSubmitDisabled}
                  className={(!validation.canSubmit || isSubmitDisabled) ? "opacity-50 cursor-not-allowed" : ""}
                  title={!validation.canSubmit ? 
                    (validation.errors.length > 0 ? "Please fix form errors" : "No changes to save") : 
                    isSubmitDisabled ? "Please wait before submitting again" :
                    "Save customer changes"}
                >
                  <Save className="h-4 w-4 mr-2" />
                  {isSaving ? 'Saving...' : isSubmitDisabled ? 'Processing...' : 'Save Changes'}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}