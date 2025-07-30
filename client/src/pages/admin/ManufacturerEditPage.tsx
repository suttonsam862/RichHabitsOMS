import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  ArrowLeft, 
  Save, 
  User, 
  Building2, 
  Tag, 
  DollarSign, 
  FileText,
  Plus,
  X,
  AlertCircle
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';

// Form validation schema
const manufacturerFormSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  company: z.string().min(1, 'Company name is required'),
  phone: z.string().optional(),
  email: z.string().email('Valid email is required'),
  notes: z.string().optional(),
  preferredCategories: z.array(z.string()).default([]),
  pricingTiers: z.array(z.object({
    category: z.string(),
    basePrice: z.number().min(0),
    markup: z.number().min(0).max(100)
  })).default([])
});

type ManufacturerFormData = z.infer<typeof manufacturerFormSchema>;

interface Manufacturer {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  company?: string;
  role: string;
  createdAt: string;
  custom_attributes?: {
    notes?: string;
    preferredCategories?: string[];
    pricingTiers?: Array<{
      category: string;
      basePrice: number;
      markup: number;
    }>;
  };
}

interface Category {
  id: string;
  name: string;
}

export default function ManufacturerEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [newCategory, setNewCategory] = useState('');
  const [newPricingTier, setNewPricingTier] = useState({
    category: '',
    basePrice: 0,
    markup: 0
  });

  // Form setup
  const form = useForm<ManufacturerFormData>({
    resolver: zodResolver(manufacturerFormSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      company: '',
      phone: '',
      email: '',
      notes: '',
      preferredCategories: [],
      pricingTiers: []
    }
  });

  // Fetch manufacturer data
  const { data: manufacturer, isLoading: isLoadingManufacturer, error: manufacturerError } = useQuery<Manufacturer>({
    queryKey: ['/api/user-management/users', id],
    enabled: !!id
  });

  // Fetch available categories
  const { data: categoriesData } = useQuery<{ data: Category[] }>({
    queryKey: ['/api/catalog-options/categories']
  });

  const categories = categoriesData?.data || [];

  // Update form when manufacturer data is loaded
  useEffect(() => {
    if (manufacturer) {
      const customAttrs = manufacturer.custom_attributes || {};
      form.reset({
        firstName: manufacturer.firstName || '',
        lastName: manufacturer.lastName || '',
        company: manufacturer.company || '',
        phone: manufacturer.phone || '',
        email: manufacturer.email || '',
        notes: customAttrs.notes || '',
        preferredCategories: customAttrs.preferredCategories || [],
        pricingTiers: customAttrs.pricingTiers || []
      });
    }
  }, [manufacturer, form]);

  // Update manufacturer mutation
  const updateManufacturerMutation = useMutation({
    mutationFn: async (data: ManufacturerFormData) => {
      const response = await fetch(`/api/user-management/users/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify({
          firstName: data.firstName,
          lastName: data.lastName,
          company: data.company,
          phone: data.phone,
          notes: data.notes,
          preferredCategories: data.preferredCategories,
          pricingTiers: data.pricingTiers
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update manufacturer');
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Manufacturer profile updated successfully"
      });
      queryClient.invalidateQueries({ queryKey: ['/api/user-management/users'] });
      navigate('/admin/manufacturers');
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update manufacturer profile",
        variant: "destructive"
      });
    }
  });

  const onSubmit = (data: ManufacturerFormData) => {
    updateManufacturerMutation.mutate(data);
  };

  const addPreferredCategory = () => {
    if (newCategory && !form.getValues('preferredCategories').includes(newCategory)) {
      const currentCategories = form.getValues('preferredCategories');
      form.setValue('preferredCategories', [...currentCategories, newCategory]);
      setNewCategory('');
    }
  };

  const removePreferredCategory = (categoryToRemove: string) => {
    const currentCategories = form.getValues('preferredCategories');
    form.setValue('preferredCategories', currentCategories.filter(cat => cat !== categoryToRemove));
  };

  const addPricingTier = () => {
    if (newPricingTier.category && newPricingTier.basePrice >= 0) {
      const currentTiers = form.getValues('pricingTiers');
      // Remove existing tier for this category if it exists
      const filteredTiers = currentTiers.filter(tier => tier.category !== newPricingTier.category);
      form.setValue('pricingTiers', [...filteredTiers, newPricingTier]);
      setNewPricingTier({ category: '', basePrice: 0, markup: 0 });
    }
  };

  const removePricingTier = (categoryToRemove: string) => {
    const currentTiers = form.getValues('pricingTiers');
    form.setValue('pricingTiers', currentTiers.filter(tier => tier.category !== categoryToRemove));
  };

  if (isLoadingManufacturer) {
    return (
      <div className="container mx-auto py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (manufacturerError) {
    return (
      <div className="container mx-auto py-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Failed to load manufacturer data. Please try again.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!manufacturer) {
    return (
      <div className="container mx-auto py-8">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Manufacturer not found.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            onClick={() => navigate('/admin/manufacturers')}
            className="flex items-center space-x-2"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Manufacturers</span>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Edit Manufacturer</h1>
            <p className="text-muted-foreground">
              Update manufacturer profile and preferences
            </p>
          </div>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Basic Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <User className="h-5 w-5" />
                  <span>Basic Information</span>
                </CardTitle>
                <CardDescription>
                  Core manufacturer profile details
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>First Name</FormLabel>
                        <FormControl>
                          <Input placeholder="First name" {...field} />
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
                          <Input placeholder="Last name" {...field} />
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
                        <Input type="email" placeholder="email@company.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone</FormLabel>
                      <FormControl>
                        <Input placeholder="+1 (555) 123-4567" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Company Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Building2 className="h-5 w-5" />
                  <span>Company Information</span>
                </CardTitle>
                <CardDescription>
                  Manufacturing company details
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="company"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Company Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Manufacturing Company Inc." {...field} />
                      </FormControl>
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
                          placeholder="Internal notes about this manufacturer..."
                          className="min-h-[100px]"
                          {...field} 
                        />
                      </FormControl>
                      <FormDescription>
                        Internal notes visible only to staff
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          </div>

          {/* Preferred Categories */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Tag className="h-5 w-5" />
                <span>Preferred Categories</span>
              </CardTitle>
              <CardDescription>
                Product categories this manufacturer specializes in
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Current preferred categories */}
              <div className="flex flex-wrap gap-2">
                {form.watch('preferredCategories').map((category) => (
                  <Badge key={category} variant="secondary" className="flex items-center space-x-2">
                    <span>{category}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-4 w-4 p-0 hover:bg-transparent"
                      onClick={() => removePreferredCategory(category)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </Badge>
                ))}
                {form.watch('preferredCategories').length === 0 && (
                  <p className="text-sm text-muted-foreground">No preferred categories selected</p>
                )}
              </div>

              {/* Add new category */}
              <div className="flex space-x-2">
                <Select value={newCategory} onValueChange={setNewCategory}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Select a category to add" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories
                      .filter(cat => !form.watch('preferredCategories').includes(cat.name))
                      .map((category) => (
                      <SelectItem key={category.id} value={category.name}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="outline"
                  onClick={addPreferredCategory}
                  disabled={!newCategory}
                  className="flex items-center space-x-2"
                >
                  <Plus className="h-4 w-4" />
                  <span>Add</span>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Pricing Tiers */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <DollarSign className="h-5 w-5" />
                <span>Pricing Tiers</span>
              </CardTitle>
              <CardDescription>
                Category-specific pricing structure for this manufacturer
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Current pricing tiers */}
              <div className="space-y-2">
                {form.watch('pricingTiers').map((tier) => (
                  <div
                    key={tier.category}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex-1">
                      <div className="font-medium">{tier.category}</div>
                      <div className="text-sm text-muted-foreground">
                        Base: ${tier.basePrice} • Markup: {tier.markup}%
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removePricingTier(tier.category)}
                      className="text-destructive hover:text-destructive"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                {form.watch('pricingTiers').length === 0 && (
                  <p className="text-sm text-muted-foreground">No pricing tiers configured</p>
                )}
              </div>

              {/* Add new pricing tier */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                <Select 
                  value={newPricingTier.category} 
                  onValueChange={(value) => setNewPricingTier(prev => ({ ...prev, category: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.name}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  type="number"
                  placeholder="Base Price"
                  value={newPricingTier.basePrice || ''}
                  onChange={(e) => setNewPricingTier(prev => ({ 
                    ...prev, 
                    basePrice: parseFloat(e.target.value) || 0 
                  }))}
                />
                <Input
                  type="number"
                  placeholder="Markup %"
                  value={newPricingTier.markup || ''}
                  onChange={(e) => setNewPricingTier(prev => ({ 
                    ...prev, 
                    markup: parseFloat(e.target.value) || 0 
                  }))}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={addPricingTier}
                  disabled={!newPricingTier.category || newPricingTier.basePrice < 0}
                  className="flex items-center space-x-2"
                >
                  <Plus className="h-4 w-4" />
                  <span>Add</span>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Save Button */}
          <div className="flex justify-end space-x-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/admin/manufacturers')}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={updateManufacturerMutation.isPending}
              className="flex items-center space-x-2"
            >
              <Save className="h-4 w-4" />
              <span>
                {updateManufacturerMutation.isPending ? 'Saving...' : 'Save Changes'}
              </span>
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}