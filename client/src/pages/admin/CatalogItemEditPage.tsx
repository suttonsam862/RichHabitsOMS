import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Save, Loader2, Plus, X, Upload, Image as ImageIcon, Star, Eye, Trash2, Download, GripVertical } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useFormValidation } from "@/hooks/useFormValidation";
import { useFormNavigationBlock } from "@/hooks/useFormNavigationBlock";
import { getFieldStyles } from "@/lib/utils";
import { useUndoableDelete } from "@/hooks/useUndoableDelete";
import DeleteConfirmationModal from "@/components/ui/DeleteConfirmationModal";

const catalogItemSchema = z.object({
  name: z.string().min(1, "Name is required"),
  base_price: z.number().min(0, "Base price must be positive"),
  sport: z.string().optional(),
  fabric: z.string().optional(),
  status: z.enum(['active', 'inactive']),
  sizes: z.array(z.object({
    name: z.string().min(1, "Size name is required"),
    description: z.string().optional()
  })).optional().default([]),
  colors: z.array(z.object({
    name: z.string().min(1, "Color name is required"),
    hex: z.string().optional(),
    description: z.string().optional()
  })).optional().default([]),
  images: z.array(z.object({
    id: z.string(),
    url: z.string(),
    alt: z.string().optional(),
    isPrimary: z.boolean().default(false)
  })).optional().default([])
});

type CatalogItemFormData = z.infer<typeof catalogItemSchema>;

interface CatalogItem extends CatalogItemFormData {
  id: string;
  category: string;
  sku: string;
  created_at: string;
  updated_at: string;
}

export default function CatalogItemEditPage() {
  const { itemId } = useParams<{ itemId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // State for image upload
  const [isUploading, setIsUploading] = React.useState(false);
  const [uploadProgress, setUploadProgress] = React.useState(0);
  const [isSubmitDisabled, setIsSubmitDisabled] = React.useState(false);

  // Undoable delete with confirmation modal for catalog items
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
    entityName: 'catalog item',
    deleteEndpoint: '/api/catalog',
    invalidateQueries: ['/api/catalog'],
    requiresConfirmation: true,
    confirmationItemType: 'catalog-item',
    requiresTyping: true, // Require typing item name for high-risk deletion
    onDeleteSuccess: () => {
      toast({
        title: "Catalog Item Deleted",
        description: "The catalog item has been successfully deleted.",
        variant: "default"
      });
      navigate('/catalog');
    }
  });

  // Fetch catalog item data
  const { data: catalogItem, isLoading } = useQuery({
    queryKey: ['/api/catalog', itemId],
    queryFn: async () => {
      const response = await fetch(`/api/catalog/${itemId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch catalog item');
      }
      
      const result = await response.json();
      const data = result.data || result;
      
      // Convert response to match our form structure
      return {
        id: data.id,
        name: data.name || '',
        base_price: parseFloat(data.basePrice || data.base_price) || 0,
        sport: data.sport || '',
        fabric: data.fabric || '',
        status: data.status || 'active',
        category: data.category || '',
        sku: data.sku || '',
        sizes: Array.isArray(data.sizes) ? data.sizes : [],
        colors: Array.isArray(data.colors) ? data.colors : [],
        images: Array.isArray(data.images) ? data.images : [],
        created_at: data.created_at,
        updated_at: data.updated_at
      } as CatalogItem;
    },
    enabled: !!itemId
  });

  const form = useForm<CatalogItemFormData>({
    resolver: zodResolver(catalogItemSchema),
    defaultValues: {
      name: '',
      base_price: 0,
      sport: '',
      fabric: '',
      status: 'active',
      sizes: [],
      colors: [],
      images: []
    }
  });

  // Field arrays for managing sizes and colors
  const sizesFieldArray = useFieldArray({
    control: form.control,
    name: "sizes"
  });

  const colorsFieldArray = useFieldArray({
    control: form.control,
    name: "colors"
  });

  const imagesFieldArray = useFieldArray({
    control: form.control,
    name: "images"
  });

  // Store initial data for comparison
  const [initialData, setInitialData] = React.useState<CatalogItemFormData | undefined>(undefined);

  // Update form when catalog item data loads
  React.useEffect(() => {
    if (catalogItem) {
      const formData = {
        name: catalogItem.name,
        base_price: catalogItem.base_price,
        sport: catalogItem.sport || '',
        fabric: catalogItem.fabric || '',
        status: catalogItem.status,
        sizes: catalogItem.sizes || [],
        colors: catalogItem.colors || [],
        images: catalogItem.images || []
      };
      form.reset(formData);
      setInitialData(formData);
    }
  }, [catalogItem, form]);

  // Form validation hook
  const validation = useFormValidation({
    form,
    initialData,
    requiredFields: ['name', 'base_price'],
    ignoreFields: ['images'] // Don't require changes to images for form validity
  });

  // Block navigation during form submission
  useFormNavigationBlock({
    when: validation.isSubmitDisabled || updateMutation.isPending,
    message: "Your catalog item is being saved. Please wait for the process to complete before leaving."
  });

  // Update mutation (supports both PATCH and PUT)
  const updateMutation = useMutation({
    mutationFn: async (data: CatalogItemFormData) => {
      const response = await fetch(`/api/catalog/${itemId}`, {
        method: 'PATCH', // Using PATCH for partial updates (PUT also available)
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update catalog item');
      }

      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Catalog item updated",
        description: "The catalog item has been successfully updated.",
      });
      
      // Update form with new values from response
      const updatedItem = data.data || data;
      if (updatedItem) {
        const formData = {
          name: updatedItem.name || '',
          base_price: parseFloat(updatedItem.basePrice || updatedItem.base_price) || 0,
          sport: updatedItem.sport || '',
          fabric: updatedItem.fabric || '',
          status: updatedItem.status || 'active',
          sizes: Array.isArray(updatedItem.sizes) ? updatedItem.sizes : [],
          colors: Array.isArray(updatedItem.colors) ? updatedItem.colors : [],
          images: Array.isArray(updatedItem.images) ? updatedItem.images : []
        };
        
        form.reset(formData);
        setInitialData(formData);
      }
      
      // Update React Query cache
      queryClient.setQueryData(['/api/catalog', itemId], updatedItem);
      queryClient.invalidateQueries({ queryKey: ['/api/catalog'] });
      
      // Navigate back to catalog
      navigate('/admin/catalog');
      
      // Re-enable submit after 1 second
      setTimeout(() => setIsSubmitDisabled(false), 1000);
    },
    onError: (error: Error) => {
      toast({
        title: "Update failed",
        description: error.message,
        variant: "destructive",
      });
      
      // Re-enable submit after 1 second on error
      setTimeout(() => setIsSubmitDisabled(false), 1000);
    }
  });

  // Image upload function
  const uploadImages = async (files: FileList) => {
    setIsUploading(true);
    setUploadProgress(0);
    
    try {
      const uploadedImages = [];
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const formData = new FormData();
        formData.append('image', file);
        
        const response = await fetch(`/api/catalog/${itemId}/images`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`
          },
          body: formData
        });
        
        if (!response.ok) {
          throw new Error(`Failed to upload ${file.name}`);
        }
        
        const result = await response.json();
        uploadedImages.push({
          id: result.data.imageId || `img_${Date.now()}_${i}`,
          url: result.data.url,
          alt: file.name,
          isPrimary: imagesFieldArray.fields.length === 0 && i === 0
        });
        
        setUploadProgress(((i + 1) / files.length) * 100);
      }
      
      // Add uploaded images to form
      uploadedImages.forEach(image => {
        imagesFieldArray.append(image);
      });
      
      toast({
        title: "Images uploaded",
        description: `Successfully uploaded ${uploadedImages.length} image(s)`,
      });
      
    } catch (error: any) {
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  // Handle file input change
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      uploadImages(files);
    }
  };

  // Set primary image
  const setPrimaryImage = (index: number) => {
    const currentImages = form.getValues('images');
    const updatedImages = currentImages.map((img, i) => ({
      ...img,
      isPrimary: i === index
    }));
    form.setValue('images', updatedImages);
  };

  // Remove image with proper error handling and user feedback
  const removeImage = async (index: number) => {
    const currentImages = form.getValues('images');
    const imageToRemove = currentImages[index];
    
    if (!imageToRemove.id) {
      toast({
        title: "Error",
        description: "Cannot delete image: missing image ID",
        variant: "destructive",
      });
      return;
    }

    try {
      // Show loading state could be added here if needed
      
      const response = await fetch(`/api/catalog/${itemId}/images/${imageToRemove.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete image');
      }
      
      // Remove from form array
      imagesFieldArray.remove(index);
      
      // If removed image was primary, set first remaining as primary
      const remainingImages = form.getValues('images');
      if (imageToRemove.isPrimary && remainingImages.length > 0) {
        setPrimaryImage(0);
      }
      
      toast({
        title: "Image deleted",
        description: "Image has been successfully removed from storage and catalog",
      });
      
    } catch (error: any) {
      console.error('Failed to delete image from storage:', error);
      toast({
        title: "Delete failed",
        description: error.message || "Failed to delete image. Please try again.",
        variant: "destructive",
      });
    }
  };

  const onSubmit = (data: CatalogItemFormData) => {
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
    updateMutation.mutate(data);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center space-x-4 mb-6">
          <Button variant="ghost" onClick={() => navigate('/admin/catalog')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Catalog
          </Button>
        </div>
        
        {/* Header Skeleton */}
        <div className="mb-6">
          <Skeleton className="h-8 w-56 mb-2" />
          <Skeleton className="h-4 w-40" />
        </div>

        {/* Main Content Skeleton */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Basic Information Form */}
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-40" />
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Basic Fields */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-10 w-full" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-10 w-full" />
                </div>
                <div className="grid gap-4 md:grid-cols-2">
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
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-10 w-full" />
                </div>
              </div>

              {/* Sizes Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-5 w-12" />
                  <Skeleton className="h-8 w-20" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                </div>
              </div>

              {/* Colors Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-5 w-16" />
                  <Skeleton className="h-8 w-20" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-4 pt-4">
                <Skeleton className="h-10 w-32" />
                <Skeleton className="h-10 w-20" />
              </div>
            </CardContent>
          </Card>

          {/* Image Management */}
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Upload Area */}
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8">
                <div className="text-center space-y-4">
                  <Skeleton className="h-12 w-12 rounded mx-auto" />
                  <div className="space-y-2">
                    <Skeleton className="h-5 w-48 mx-auto" />
                    <Skeleton className="h-4 w-36 mx-auto" />
                  </div>
                  <Skeleton className="h-10 w-32 mx-auto" />
                </div>
              </div>

              {/* Image Gallery */}
              <div className="space-y-4">
                <Skeleton className="h-5 w-20" />
                <div className="grid grid-cols-2 gap-4">
                  <div className="relative">
                    <Skeleton className="h-32 w-full rounded" />
                    <div className="absolute top-2 right-2 space-x-1">
                      <Skeleton className="h-6 w-6 rounded" />
                      <Skeleton className="h-6 w-6 rounded" />
                    </div>
                  </div>
                  <div className="relative">
                    <Skeleton className="h-32 w-full rounded" />
                    <div className="absolute top-2 right-2 space-x-1">
                      <Skeleton className="h-6 w-6 rounded" />
                      <Skeleton className="h-6 w-6 rounded" />
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!catalogItem) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center space-x-4 mb-6">
          <Button variant="ghost" onClick={() => navigate('/admin/catalog')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Catalog
          </Button>
        </div>
        <Card>
          <CardContent className="py-16 text-center">
            <h3 className="text-lg font-medium mb-2">Catalog item not found</h3>
            <p className="text-muted-foreground">The catalog item you're trying to edit doesn't exist.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6">
      <div className="flex items-center space-x-4 mb-6">
        <Button variant="ghost" onClick={() => navigate('/admin/catalog')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Catalog
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Edit Catalog Item</h1>
          <p className="text-muted-foreground">{catalogItem.name} ({catalogItem.sku})</p>
          {catalogItem?.updated_at && (
            <p className="text-sm text-muted-foreground">
              Last updated: {new Date(catalogItem.updated_at).toLocaleString()}
            </p>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Catalog Item Details</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              
              {/* Confirmation Modal */}
              <DeleteConfirmationModal
                isOpen={showConfirmation}
                onClose={handleCancelConfirmation}
                onConfirm={handleConfirmDelete}
                title="Delete Catalog Item"
                description={`Are you sure you want to delete "${confirmationData?.itemDisplayName || 'this catalog item'}"? This is a high-risk operation.`}
                itemName={confirmationData?.itemDisplayName}
                itemType={confirmationItemType}
                requiresTyping={requiresTyping}
                isDeleting={isDeleting}
              />
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Product Name</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Enter product name" 
                        {...field} 
                        className={getFieldStyles('name', validation.changedFields, !!form.formState.errors.name)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="base_price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Base Price ($)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        step="0.01" 
                        min="0"
                        placeholder="0.00" 
                        {...field}
                        value={field.value || ''}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        className={getFieldStyles('base_price', validation.changedFields, !!form.formState.errors.base_price)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="sport"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sport</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Basketball, Soccer" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="fabric"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fabric</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Polyester, Cotton" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Size Variants Management */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-medium">Size Variants</h3>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => sizesFieldArray.append({ name: '', description: '' })}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Size
                  </Button>
                </div>
                
                {sizesFieldArray.fields.length === 0 && (
                  <p className="text-muted-foreground text-sm mb-4">No sizes added yet</p>
                )}
                
                <div className="space-y-3">
                  {sizesFieldArray.fields.map((field, index) => (
                    <div key={field.id} className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3 border rounded-lg">
                      <FormField
                        control={form.control}
                        name={`sizes.${index}.name`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Size Name</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g., Small, Medium, XL" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name={`sizes.${index}.description`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Description (Optional)</FormLabel>
                            <div className="flex space-x-2">
                              <FormControl>
                                <Input placeholder="e.g., Chest 34-36 inches" {...field} />
                              </FormControl>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => sizesFieldArray.remove(index)}
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Color Variants Management */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-medium">Color Variants</h3>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => colorsFieldArray.append({ name: '', hex: '', description: '' })}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Color
                  </Button>
                </div>
                
                {colorsFieldArray.fields.length === 0 && (
                  <p className="text-muted-foreground text-sm mb-4">No colors added yet</p>
                )}
                
                <div className="space-y-3">
                  {colorsFieldArray.fields.map((field, index) => (
                    <div key={field.id} className="grid grid-cols-1 md:grid-cols-3 gap-3 p-3 border rounded-lg">
                      <FormField
                        control={form.control}
                        name={`colors.${index}.name`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Color Name</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g., Navy Blue, Red" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name={`colors.${index}.hex`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Hex Code (Optional)</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g., #FF0000" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name={`colors.${index}.description`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Description (Optional)</FormLabel>
                            <div className="flex space-x-2">
                              <FormControl>
                                <Input placeholder="e.g., Matte finish" {...field} />
                              </FormControl>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => colorsFieldArray.remove(index)}
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Image Management */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-medium">Product Images</h3>
                  <div className="space-x-2">
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={handleFileChange}
                      className="hidden"
                      id="image-upload"
                      disabled={isUploading}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={isUploading}
                      onClick={() => document.getElementById('image-upload')?.click()}
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      {isUploading ? `Uploading... ${uploadProgress.toFixed(0)}%` : 'Upload Images'}
                    </Button>
                  </div>
                </div>
                
                {imagesFieldArray.fields.length === 0 && !isUploading && (
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                    <ImageIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-muted-foreground">No images uploaded yet</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Click "Upload Images" to add product photos
                    </p>
                  </div>
                )}
                
                {isUploading && (
                  <div className="border rounded-lg p-4 bg-gray-50">
                    <div className="flex items-center justify-center space-x-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span className="text-sm">Uploading images... {uploadProgress.toFixed(0)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  </div>
                )}
                
                {imagesFieldArray.fields.length > 0 && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <span>{imagesFieldArray.fields.length} image{imagesFieldArray.fields.length !== 1 ? 's' : ''} uploaded</span>
                      <span>Click images to preview • Hover for actions</span>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {imagesFieldArray.fields.map((field, index) => {
                        const image = form.getValues(`images.${index}`);
                        return (
                          <div key={field.id} className="relative group border rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200">
                            {/* Drag handle */}
                            <div className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                              <div className="bg-white rounded p-1 shadow-sm cursor-move" title="Drag to reorder">
                                <GripVertical className="w-4 h-4 text-gray-600" />
                              </div>
                            </div>
                            
                            <div className="aspect-square bg-gray-100 flex items-center justify-center relative">
                              <img
                                src={image.url}
                                alt={image.alt || `Product image ${index + 1}`}
                                className="w-full h-full object-cover cursor-pointer"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgdmlld0JveD0iMCAwIDEwMCAxMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0zNSA2NUw1MCA0NUw2NSA2NUgzNVoiIGZpbGw9IiM5Q0EzQUYiLz4KPC9zdmc+';
                                }}
                              />
                              
                              {/* Image overlay for preview */}
                              <Dialog>
                                <DialogTrigger asChild>
                                  <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-20 transition-all duration-200 flex items-center justify-center cursor-pointer">
                                    <Eye className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                                  </div>
                                </DialogTrigger>
                                <DialogContent className="max-w-4xl w-full">
                                  <DialogHeader>
                                    <DialogTitle>Image Preview - {image.alt || `Product Image ${index + 1}`}</DialogTitle>
                                  </DialogHeader>
                                  <div className="space-y-4">
                                    <div className="flex justify-center bg-gray-50 rounded-lg p-4">
                                      <img
                                        src={image.url}
                                        alt={image.alt || `Product image ${index + 1}`}
                                        className="max-h-96 w-auto object-contain"
                                      />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                      <div>
                                        <span className="font-medium text-muted-foreground">Status:</span>
                                        <span className={`ml-2 px-2 py-1 rounded text-xs ${image.isPrimary ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-600'}`}>
                                          {image.isPrimary ? 'Primary Image' : 'Gallery Image'}
                                        </span>
                                      </div>
                                      <div>
                                        <span className="font-medium text-muted-foreground">Alt Text:</span>
                                        <span className="ml-2">{image.alt || 'Not set'}</span>
                                      </div>
                                    </div>
                                    <div className="flex justify-end space-x-2">
                                      <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => window.open(image.url, '_blank')}
                                      >
                                        <Download className="w-4 h-4 mr-2" />
                                        Open Full Size
                                      </Button>
                                    </div>
                                  </div>
                                </DialogContent>
                              </Dialog>
                            </div>
                            
                            {/* Primary badge */}
                            {image.isPrimary && (
                              <div className="absolute top-2 left-2 bg-yellow-500 text-white px-2 py-1 rounded text-xs font-medium flex items-center shadow-sm">
                                <Star className="w-3 h-3 mr-1" />
                                Primary
                              </div>
                            )}
                            
                            {/* Hover actions */}
                            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all duration-200 flex items-center justify-center opacity-0 group-hover:opacity-100">
                              <div className="flex space-x-2">
                                {!image.isPrimary && (
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="secondary"
                                    onClick={() => setPrimaryImage(index)}
                                    className="text-xs shadow-sm"
                                    title="Set as primary image"
                                  >
                                    <Star className="w-3 h-3 mr-1" />
                                    Set Primary
                                  </Button>
                                )}
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant="destructive"
                                      className="text-xs shadow-sm"
                                      title="Delete image"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Delete Image</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Are you sure you want to delete this image? This will permanently remove it from both storage and the catalog item. This action cannot be undone.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                      <AlertDialogAction 
                                        onClick={() => removeImage(index)}
                                        className="bg-red-600 hover:bg-red-700"
                                      >
                                        Delete Image
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </div>
                            </div>
                            
                            {/* Alt text input */}
                            <div className="p-3 border-t bg-gray-50">
                              <FormField
                                control={form.control}
                                name={`images.${index}.alt`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormControl>
                                      <Input 
                                        placeholder="Add alt text for accessibility..." 
                                        {...field}
                                        className="text-xs border-gray-200 focus:border-blue-500"
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <div className="mt-1 text-xs text-muted-foreground">
                                Image {index + 1} • {image.isPrimary ? 'Primary' : 'Gallery'}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

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

              <div className="flex justify-between items-center space-x-2">
                <div className="flex space-x-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => navigate('/admin/catalog')}
                    disabled={updateMutation.isPending || isDeleting}
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={updateMutation.isPending || !validation.canSubmit || isSubmitDisabled || isDeleting}
                    className={`bg-blue-600 hover:bg-blue-700 ${(!validation.canSubmit || isSubmitDisabled) ? "opacity-50 cursor-not-allowed" : ""}`}
                    title={!validation.canSubmit ? 
                      (validation.errors.length > 0 ? "Please fix form errors" : "No changes to save") : 
                      isSubmitDisabled ? "Please wait before submitting again" :
                      "Save catalog item changes"}
                  >
                    {updateMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Updating...
                      </>
                    ) : isSubmitDisabled ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        Update Item
                      </>
                    )}
                  </Button>
                </div>

                {/* Delete Button */}
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => softDelete(catalogItem.id, catalogItem, catalogItem.name)}
                  disabled={updateMutation.isPending || isDeleting}
                  className="text-red-400 hover:bg-red-500/10 hover:text-red-300 border-red-400/30 hover:border-red-400"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  {isDeleting ? 'Deleting...' : 'Delete Item'}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}