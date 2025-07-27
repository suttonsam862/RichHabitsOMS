import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Edit, Trash2, Upload, Image as ImageIcon, Eye, Search, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import OptimizedImage from '@/components/OptimizedImage';

interface CatalogItem {
  id: string;
  name: string;
  category: string;
  sport: string;
  basePrice: number;
  unitCost: number;
  sku: string;
  etaDays: string;
  status: 'active' | 'inactive';
  imageUrl?: string;
  measurementChartUrl?: string;
  createdAt: string;
  updatedAt: string;
}

interface CatalogFormData {
  name: string;
  category: string;
  sport: string;
  basePrice: number;
  unitCost: number;
  sku: string;
  etaDays: string;
  status: 'active' | 'inactive';
}

export default function CatalogPage() {
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [editingItem, setEditingItem] = useState<CatalogItem | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [formData, setFormData] = useState<CatalogFormData>({
    name: '',
    category: '',
    sport: '',
    basePrice: 0,
    unitCost: 0,
    sku: '',
    etaDays: '',
    status: 'active'
  });

  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch catalog items
  const { data: catalogItems = [], isLoading, error } = useQuery({
    queryKey: ['/api/catalog'],
    select: (data) => data?.data || []
  });

  // Fetch categories and sports for dropdowns
  const { data: categories = [] } = useQuery({
    queryKey: ['/api/catalog-options/categories'],
    select: (data) => data?.categories || []
  });

  const { data: sports = [] } = useQuery({
    queryKey: ['/api/catalog-options/sports'],
    select: (data) => data?.sports || []
  });

  // Create catalog item mutation
  const createItemMutation = useMutation({
    mutationFn: async (data: CatalogFormData) => {
      return apiRequest('/api/catalog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['/api/catalog'] });
      setIsAddingItem(false);
      resetForm();
      
      // Upload image if file is selected
      if (selectedFile && result?.item?.id) {
        uploadImage(result.item.id);
      }
      
      toast({
        title: 'Success',
        description: 'Catalog item created successfully',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Failed to create catalog item',
        variant: 'destructive'
      });
    }
  });

  // Update catalog item mutation
  const updateItemMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<CatalogFormData> }) => {
      return apiRequest(`/api/catalog/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/catalog'] });
      setEditingItem(null);
      resetForm();
      toast({
        title: 'Success',
        description: 'Catalog item updated successfully',
      });
    }
  });

  // Delete catalog item mutation
  const deleteItemMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest(`/api/catalog/${id}`, { method: 'DELETE' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/catalog'] });
      toast({
        title: 'Success',
        description: 'Catalog item deleted successfully',
      });
    }
  });

  // Image upload function
  const uploadImage = async (catalogItemId: string) => {
    if (!selectedFile) return;

    const imageFormData = new FormData();
    imageFormData.append('image', selectedFile);

    try {
      await apiRequest(`/api/images/catalog/${catalogItemId}`, {
        method: 'POST',
        body: imageFormData
      });
      
      queryClient.invalidateQueries({ queryKey: ['/api/catalog'] });
      setSelectedFile(null);
      setImagePreview(null);
      
      toast({
        title: 'Success',
        description: 'Image uploaded successfully',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to upload image',
        variant: 'destructive'
      });
    }
  };

  // Handle file selection
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      name: '',
      category: '',
      sport: '',
      basePrice: 0,
      unitCost: 0,
      sku: '',
      etaDays: '',
      status: 'active'
    });
    setSelectedFile(null);
    setImagePreview(null);
  };

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingItem) {
      updateItemMutation.mutate({ id: editingItem.id, data: formData });
    } else {
      createItemMutation.mutate(formData);
    }
  };

  // Filter items based on search
  const filteredItems = catalogItems.filter((item: CatalogItem) =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.sport.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.sku.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Start editing
  const startEditing = (item: CatalogItem) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      category: item.category,
      sport: item.sport,
      basePrice: item.basePrice,
      unitCost: item.unitCost,
      sku: item.sku,
      etaDays: item.etaDays,
      status: item.status
    });
    setIsAddingItem(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading catalog...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Product Catalog</h1>
        <Button onClick={() => setIsAddingItem(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Item
        </Button>
      </div>

      {/* Search */}
      <div className="flex items-center space-x-2">
        <Search className="w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search catalog items..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
      </div>

      {/* Add/Edit Form */}
      {isAddingItem && (
        <Card>
          <CardHeader>
            <CardTitle>{editingItem ? 'Edit' : 'Add'} Catalog Item</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="category">Category</Label>
                  <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((category: string) => (
                        <SelectItem key={category} value={category}>
                          {category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="sport">Sport</Label>
                  <Select value={formData.sport} onValueChange={(value) => setFormData({ ...formData, sport: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select sport" />
                    </SelectTrigger>
                    <SelectContent>
                      {sports.map((sport: string) => (
                        <SelectItem key={sport} value={sport}>
                          {sport}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="sku">SKU</Label>
                  <Input
                    id="sku"
                    value={formData.sku}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="basePrice">Base Price</Label>
                  <Input
                    id="basePrice"
                    type="number"
                    step="0.01"
                    value={formData.basePrice}
                    onChange={(e) => setFormData({ ...formData, basePrice: parseFloat(e.target.value) || 0 })}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="unitCost">Unit Cost</Label>
                  <Input
                    id="unitCost"
                    type="number"
                    step="0.01"
                    value={formData.unitCost}
                    onChange={(e) => setFormData({ ...formData, unitCost: parseFloat(e.target.value) || 0 })}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="etaDays">ETA (Days)</Label>
                  <Input
                    id="etaDays"
                    value={formData.etaDays}
                    onChange={(e) => setFormData({ ...formData, etaDays: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="status">Status</Label>
                  <Select value={formData.status} onValueChange={(value: 'active' | 'inactive') => setFormData({ ...formData, status: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Image Upload */}
              <div>
                <Label htmlFor="image">Product Image</Label>
                <div className="mt-2">
                  <Input
                    id="image"
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <Label htmlFor="image" className="cursor-pointer inline-flex items-center px-4 py-2 border border-dashed border-gray-300 rounded-md">
                    <Upload className="w-4 h-4 mr-2" />
                    Choose Image
                  </Label>
                  {imagePreview && (
                    <div className="mt-2">
                      <img src={imagePreview} alt="Preview" className="w-32 h-32 object-cover rounded-md" />
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => {
                  setIsAddingItem(false);
                  setEditingItem(null);
                  resetForm();
                }}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createItemMutation.isPending || updateItemMutation.isPending}>
                  {(createItemMutation.isPending || updateItemMutation.isPending) && (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  )}
                  {editingItem ? 'Update' : 'Create'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Catalog Items Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredItems.map((item: CatalogItem) => (
          <Card key={item.id} className="relative">
            <CardHeader className="pb-2">
              <div className="flex justify-between items-start">
                <CardTitle className="text-lg">{item.name}</CardTitle>
                <Badge variant={item.status === 'active' ? 'default' : 'secondary'}>
                  {item.status}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">{item.category} • {item.sport}</p>
            </CardHeader>
            
            <CardContent>
              {item.imageUrl && (
                <div className="mb-4">
                  <OptimizedImage
                    src={item.imageUrl}
                    alt={item.name}
                    className="w-full h-48 object-cover rounded-md"
                    loading="lazy"
                    placeholder="blur"
                    sizes="(max-width: 768px) 100vw, 400px"
                  />
                </div>
              )}
              
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">SKU:</span>
                  <span className="font-mono">{item.sku}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Base Price:</span>
                  <span className="font-semibold">${item.basePrice.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Unit Cost:</span>
                  <span>${item.unitCost.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">ETA:</span>
                  <span>{item.etaDays} days</span>
                </div>
              </div>

              <div className="flex justify-end space-x-2 mt-4">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => startEditing(item)}
                >
                  <Edit className="w-4 h-4" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => deleteItemMutation.mutate(item.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredItems.length === 0 && !isLoading && (
        <div className="text-center py-12">
          <ImageIcon className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No catalog items found</h3>
          <p className="text-muted-foreground mb-4">
            {searchTerm ? 'No items match your search criteria.' : 'Get started by adding your first catalog item.'}
          </p>
          {!searchTerm && (
            <Button onClick={() => setIsAddingItem(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add First Item
            </Button>
          )}
        </div>
      )}
    </div>
  );
}