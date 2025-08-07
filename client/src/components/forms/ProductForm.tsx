import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Package, 
  DollarSign, 
  Tag, 
  Palette, 
  Shirt, 
  Plus, 
  X, 
  Loader2,
  Save,
  AlertTriangle
} from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { CatalogItem } from '@/shared/schema';

// Product form validation schema
const productFormSchema = z.object({
  name: z.string().min(2, 'Product name must be at least 2 characters'),
  description: z.string().optional(),
  category: z.string().min(1, 'Category is required'),
  sport: z.string().default('All Around Item'),
  basePrice: z.string().min(1, 'Base price is required').refine(
    (val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0,
    'Base price must be a valid positive number'
  ),
  unitCost: z.string().optional().refine(
    (val) => !val || (!isNaN(parseFloat(val)) && parseFloat(val) >= 0),
    'Unit cost must be a valid non-negative number'
  ),
  fabric: z.string().min(1, 'Fabric is required'),
  sku: z.string().optional(),
  status: z.enum(['active', 'inactive', 'discontinued']).default('active'),
  etaDays: z.string().default('7'),
  minQuantity: z.string().optional(),
  maxQuantity: z.string().optional(),
  sizes: z.array(z.string()).default([]),
  colors: z.array(z.string()).default([]),
  tags: z.array(z.string()).default([]),
  buildInstructions: z.string().optional(),
});

type ProductFormData = z.infer<typeof productFormSchema>;

interface ProductFormProps {
  mode: 'create' | 'edit';
  productId?: string;
  initialData?: Partial<CatalogItem>;
  onSuccess?: (product: CatalogItem) => void;
  onCancel?: () => void;
}

const COMMON_CATEGORIES = [
  'T-Shirts',
  'Hoodies',
  'Polo Shirts',
  'Hats & Caps',
  'Bags & Accessories',
  'Athletic Wear',
  'Corporate Apparel',
  'Uniforms',
  'Outerwear',
  'Other'
];

const COMMON_FABRICS = [
  '100% Cotton',
  'Cotton Blend',
  'Polyester',
  'Tri-Blend',
  'Performance/Moisture Wicking',
  'Organic Cotton',
  'Bamboo',
  'Denim',
  'Canvas',
  'Other'
];

const COMMON_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'];
const COMMON_COLORS = ['Black', 'White', 'Navy', 'Gray', 'Red', 'Blue', 'Green', 'Yellow', 'Pink', 'Purple'];

export function ProductForm({ 
  mode, 
  productId, 
  initialData, 
  onSuccess, 
  onCancel 
}: ProductFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch existing product data for edit mode
  const { data: productData, isLoading: isLoadingProduct } = useQuery({
    queryKey: ['/api/products/library', productId],
    queryFn: async () => {
      if (!productId) return null;
      const response = await apiRequest('GET', `/api/products/library/${productId}`);
      if (!response.ok) throw new Error('Failed to fetch product');
      const result = await response.json();
      return result.data;
    },
    enabled: mode === 'edit' && !!productId,
  });

  // Initialize form
  const form = useForm<ProductFormData>({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      name: '',
      description: '',
      category: '',
      sport: 'All Around Item',
      basePrice: '',
      unitCost: '',
      fabric: '',
      sku: '',
      status: 'active',
      etaDays: '7',
      minQuantity: '1',
      maxQuantity: '1000',
      sizes: [],
      colors: [],
      tags: [],
      buildInstructions: '',
    },
  });

  // Populate form with existing data
  useEffect(() => {
    const dataToUse = productData || initialData;
    if (dataToUse) {
      const formData: Partial<ProductFormData> = {
        name: dataToUse.name || '',
        description: dataToUse.description || '',
        category: dataToUse.category || '',
        sport: dataToUse.sport || 'All Around Item',
        basePrice: String(dataToUse.basePrice || dataToUse.base_price || ''),
        unitCost: String(dataToUse.unitCost || dataToUse.unit_cost || ''),
        fabric: dataToUse.fabric || '',
        sku: dataToUse.sku || '',
        status: (dataToUse.status as 'active' | 'inactive' | 'discontinued') || 'active',
        etaDays: String(dataToUse.etaDays || dataToUse.eta_days || '7'),
        minQuantity: String(dataToUse.minQuantity || dataToUse.min_quantity || '1'),
        maxQuantity: String(dataToUse.maxQuantity || dataToUse.max_quantity || '1000'),
        sizes: Array.isArray(dataToUse.sizes) ? dataToUse.sizes : [],
        colors: Array.isArray(dataToUse.colors) ? dataToUse.colors : [],
        tags: Array.isArray(dataToUse.tags) ? dataToUse.tags : [],
        buildInstructions: dataToUse.buildInstructions || dataToUse.build_instructions || '',
      };

      // Reset form with the data
      Object.entries(formData).forEach(([key, value]) => {
        if (value !== undefined) {
          form.setValue(key as keyof ProductFormData, value);
        }
      });
    }
  }, [productData, initialData, form]);

  // Generate SKU function
  const generateSKU = (name: string, category: string): string => {
    const cleanName = name.trim().toUpperCase().replace(/[^A-Z0-9]/g, '').substring(0, 6);
    const cleanCategory = category.trim().toUpperCase().replace(/[^A-Z0-9]/g, '').substring(0, 3);
    const timestamp = Date.now().toString().slice(-4);
    const random = Math.floor(Math.random() * 99).toString().padStart(2, '0');
    return `${cleanCategory || 'ITM'}-${cleanName || 'PROD'}-${timestamp}${random}`;
  };

  // Auto-generate SKU when name or category changes (only for create mode)
  useEffect(() => {
    if (mode === 'create') {
      const subscription = form.watch((values) => {
        if (values.name && values.category && !values.sku) {
          const newSKU = generateSKU(values.name, values.category);
          form.setValue('sku', newSKU);
        }
      });
      return () => subscription.unsubscribe();
    }
  }, [form, mode]);

  // Create/Update mutation
  const { mutate: saveProduct, isPending: isSaving } = useMutation({
    mutationFn: async (data: ProductFormData) => {
      const payload = {
        name: data.name,
        description: data.description || '',
        category: data.category,
        sport: data.sport,
        base_price: parseFloat(data.basePrice),
        unit_cost: data.unitCost ? parseFloat(data.unitCost) : 0,
        fabric: data.fabric,
        sku: data.sku || generateSKU(data.name, data.category),
        status: data.status,
        eta_days: data.etaDays,
        min_quantity: data.minQuantity ? parseFloat(data.minQuantity) : 1,
        max_quantity: data.maxQuantity ? parseFloat(data.maxQuantity) : 1000,
        sizes: data.sizes,
        colors: data.colors,
        tags: data.tags,
        build_instructions: data.buildInstructions || '',
      };

      const url = mode === 'create' 
        ? '/api/products/library' 
        : `/api/products/library/${productId}`;
      
      const method = mode === 'create' ? 'POST' : 'PATCH';

      const response = await apiRequest(method, url, payload);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || `Failed to ${mode} product`);
      }
      return response.json();
    },
    onSuccess: (result) => {
      toast({
        title: 'Success',
        description: `Product ${mode === 'create' ? 'created' : 'updated'} successfully`,
      });

      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['/api/products/library'] });
      
      if (onSuccess) {
        onSuccess(result.data);
      }
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Array field handlers
  const handleArrayFieldAdd = (fieldName: 'sizes' | 'colors' | 'tags', value: string) => {
    if (!value.trim()) return;
    const currentValues = form.getValues(fieldName);
    if (!currentValues.includes(value.trim())) {
      form.setValue(fieldName, [...currentValues, value.trim()]);
    }
  };

  const handleArrayFieldRemove = (fieldName: 'sizes' | 'colors' | 'tags', index: number) => {
    const currentValues = form.getValues(fieldName);
    form.setValue(fieldName, currentValues.filter((_, i) => i !== index));
  };

  const onSubmit = (data: ProductFormData) => {
    saveProduct(data);
  };

  if (mode === 'edit' && isLoadingProduct) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center space-x-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Loading product data...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Package className="h-5 w-5" />
              <span>Basic Information</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Product Name *</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Enter product name" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="sku"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>SKU {mode === 'create' && '(Auto-generated)'}</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Product SKU" 
                        {...field} 
                        readOnly={mode === 'create'}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Enter product description" 
                      rows={3}
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid md:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {COMMON_CATEGORIES.map((category) => (
                          <SelectItem key={category} value={category}>
                            {category}
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
                name="sport"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sport</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="All Around Item" 
                        {...field} 
                      />
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
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                        <SelectItem value="discontinued">Discontinued</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        {/* Pricing & Production */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <DollarSign className="h-5 w-5" />
              <span>Pricing & Production</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="basePrice"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Base Price *</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input 
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="0.00" 
                          className="pl-10"
                          {...field} 
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="unitCost"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Unit Cost</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input 
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="0.00" 
                          className="pl-10"
                          {...field} 
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="etaDays"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Lead Time (days)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number"
                        min="1"
                        placeholder="7" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="minQuantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Minimum Quantity</FormLabel>
                    <FormControl>
                      <Input 
                        type="number"
                        min="1"
                        placeholder="1" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="maxQuantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Maximum Quantity</FormLabel>
                    <FormControl>
                      <Input 
                        type="number"
                        min="1"
                        placeholder="1000" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        {/* Materials & Specifications */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Shirt className="h-5 w-5" />
              <span>Materials & Specifications</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="fabric"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fabric *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select fabric" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {COMMON_FABRICS.map((fabric) => (
                        <SelectItem key={fabric} value={fabric}>
                          {fabric}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Sizes */}
            <div>
              <FormLabel>Available Sizes</FormLabel>
              <div className="space-y-2">
                <div className="flex flex-wrap gap-2">
                  {COMMON_SIZES.map((size) => (
                    <Button
                      key={size}
                      type="button"
                      variant={form.watch('sizes').includes(size) ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => {
                        const currentSizes = form.getValues('sizes');
                        if (currentSizes.includes(size)) {
                          form.setValue('sizes', currentSizes.filter(s => s !== size));
                        } else {
                          form.setValue('sizes', [...currentSizes, size]);
                        }
                      }}
                    >
                      {size}
                    </Button>
                  ))}
                </div>
                {form.watch('sizes').length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {form.watch('sizes').map((size, index) => (
                      <Badge key={index} variant="secondary" className="flex items-center gap-1">
                        {size}
                        <X 
                          className="h-3 w-3 cursor-pointer" 
                          onClick={() => handleArrayFieldRemove('sizes', index)}
                        />
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Colors */}
            <div>
              <FormLabel>Available Colors</FormLabel>
              <div className="space-y-2">
                <div className="flex flex-wrap gap-2">
                  {COMMON_COLORS.map((color) => (
                    <Button
                      key={color}
                      type="button"
                      variant={form.watch('colors').includes(color) ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => {
                        const currentColors = form.getValues('colors');
                        if (currentColors.includes(color)) {
                          form.setValue('colors', currentColors.filter(c => c !== color));
                        } else {
                          form.setValue('colors', [...currentColors, color]);
                        }
                      }}
                    >
                      <Palette className="h-3 w-3 mr-1" />
                      {color}
                    </Button>
                  ))}
                </div>
                {form.watch('colors').length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {form.watch('colors').map((color, index) => (
                      <Badge key={index} variant="secondary" className="flex items-center gap-1">
                        {color}
                        <X 
                          className="h-3 w-3 cursor-pointer" 
                          onClick={() => handleArrayFieldRemove('colors', index)}
                        />
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <FormField
              control={form.control}
              name="buildInstructions"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Build Instructions</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Enter special manufacturing instructions" 
                      rows={3}
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Form Actions */}
        <div className="flex items-center justify-end space-x-4 pt-4">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          )}
          <Button type="submit" disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {mode === 'create' ? 'Creating...' : 'Updating...'}
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                {mode === 'create' ? 'Create Product' : 'Update Product'}
              </>
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}