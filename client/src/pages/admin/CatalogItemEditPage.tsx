import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Save, Loader2, Plus, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

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
      colors: []
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

  // Update form when catalog item data loads
  React.useEffect(() => {
    if (catalogItem) {
      form.reset({
        name: catalogItem.name,
        base_price: catalogItem.base_price,
        sport: catalogItem.sport || '',
        fabric: catalogItem.fabric || '',
        status: catalogItem.status,
        sizes: catalogItem.sizes || [],
        colors: catalogItem.colors || []
      });
    }
  }, [catalogItem, form]);

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
      
      // Update React Query cache
      queryClient.setQueryData(['/api/catalog', itemId], data.data || data);
      queryClient.invalidateQueries({ queryKey: ['/api/catalog'] });
      
      // Navigate back to catalog
      navigate('/admin/catalog');
    },
    onError: (error: Error) => {
      toast({
        title: "Update failed",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const onSubmit = (data: CatalogItemFormData) => {
    updateMutation.mutate(data);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Loading catalog item...</span>
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
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Catalog Item Details</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Product Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter product name" {...field} />
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

              <div className="flex justify-end space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate('/admin/catalog')}
                  disabled={updateMutation.isPending}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={updateMutation.isPending}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {updateMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Update Item
                    </>
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}