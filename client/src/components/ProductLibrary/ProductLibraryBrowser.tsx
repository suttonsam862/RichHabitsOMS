/**
 * PRODUCT LIBRARY BROWSER COMPONENT
 * Main interface for browsing, filtering, and managing the ProductLibrary system
 * Integrates with ProductMockupUploader and useProductMockups hook
 */

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  Search, 
  Filter, 
  Grid, 
  List, 
  Eye,
  TrendingUp,
  TrendingDown,
  Minus,
  ImageIcon,
  DollarSign,
  Calendar,
  Tag
} from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { ProductImage } from '@/components/ui/FallbackImage';
import { ProductMockupUploader } from './ProductMockupUploader';
import { cn } from '@/lib/utils';

interface Product {
  id: string;
  name: string;
  description: string;
  sku: string;
  category: string;
  sport: string;
  base_price: number;
  unit_cost: number;
  status: string;
  created_at: string;
  metadata: {
    sizes: string[];
    colors: string[];
    customization_options: string[];
    specifications: Record<string, any>;
    tags: string[];
  };
  pricing_stats: {
    current_price: number;
    min_price: number;
    max_price: number;
    avg_price: number;
    price_changes: number;
    last_price_change: string | null;
  };
  mockup_stats: {
    total_mockups: number;
    mockup_types: string[];
    latest_mockup: any;
    has_primary_image: boolean;
  };
}

interface ProductLibraryBrowserProps {
  className?: string;
  onProductSelect?: (product: Product) => void;
}

export function ProductLibraryBrowser({ 
  className = '',
  onProductSelect 
}: ProductLibraryBrowserProps) {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [filters, setFilters] = useState({
    search: '',
    category: '',
    active_only: 'true',
    sort_by: 'created_at',
    sort_order: 'desc',
    limit: '20',
    offset: '0'
  });

  // Fetch products from ProductLibrary API
  const { data: productsData, isLoading, error, refetch } = useQuery({
    queryKey: ['/api/products/library', filters],
    queryFn: async () => {
      const queryParams = new URLSearchParams(filters).toString();
      const response = await apiRequest('GET', `/api/products/library?${queryParams}`);
      if (!response.ok) {
        throw new Error('Failed to fetch products');
      }
      const result = await response.json();
      return result.data;
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  // Fetch categories for filter dropdown
  const { data: categoriesData } = useQuery({
    queryKey: ['/api/products/library/categories'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/products/library/categories');
      if (!response.ok) throw new Error('Failed to fetch categories');
      const result = await response.json();
      return result.data.categories;
    },
  });

  const products = productsData?.products || [];
  const categories = categoriesData || [];

  const updateFilter = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value, offset: '0' }));
  };

  const formatPrice = (price: number) => `$${price.toFixed(2)}`;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getPriceTrendIcon = (stats: Product['pricing_stats']) => {
    if (stats.price_changes === 0) return <Minus className="h-4 w-4 text-gray-400" />;
    if (stats.current_price > stats.avg_price) return <TrendingUp className="h-4 w-4 text-green-500" />;
    return <TrendingDown className="h-4 w-4 text-red-500" />;
  };

  const handleProductClick = (product: Product) => {
    setSelectedProduct(product);
    if (onProductSelect) {
      onProductSelect(product);
    }
  };

  if (error) {
    return (
      <Card className="p-6">
        <div className="text-center text-red-600">
          Failed to load products. Please try again.
          <Button onClick={() => refetch()} className="ml-2">
            Retry
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header and Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Product Library</h1>
          <p className="text-gray-600">
            {isLoading ? 'Loading...' : `${products.length} products found`}
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <Button
            variant={viewMode === 'grid' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('grid')}
          >
            <Grid className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('list')}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Filter className="mr-2 h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="search">Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="search"
                  placeholder="Search products..."
                  value={filters.search}
                  onChange={(e) => updateFilter('search', e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="category">Category</Label>
              <Select value={filters.category} onValueChange={(value) => updateFilter('category', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Categories</SelectItem>
                  {categories.map((cat: any) => (
                    <SelectItem key={cat.name} value={cat.name}>
                      {cat.name} ({cat.count})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="sort">Sort By</Label>
              <Select value={filters.sort_by} onValueChange={(value) => updateFilter('sort_by', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="created_at">Created Date</SelectItem>
                  <SelectItem value="name">Name</SelectItem>
                  <SelectItem value="base_price">Price</SelectItem>
                  <SelectItem value="category">Category</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="order">Order</Label>
              <Select value={filters.sort_order} onValueChange={(value) => updateFilter('sort_order', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="desc">Descending</SelectItem>
                  <SelectItem value="asc">Ascending</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Products Display */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array(6).fill(0).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <div className="h-48 bg-gray-200 rounded-t-lg"></div>
              <CardContent className="p-4">
                <div className="h-4 bg-gray-200 rounded mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-3/4"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {products.map((product) => (
            <Card 
              key={product.id} 
              className="cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => handleProductClick(product)}
            >
              <div className="aspect-square relative overflow-hidden rounded-t-lg">
                {product.mockup_stats.latest_mockup ? (
                  <ProductImage
                    src={product.mockup_stats.latest_mockup.image_url}
                    alt={product.name}
                    className="object-cover w-full h-full"
                  />
                ) : (
                  <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                    <ImageIcon className="h-12 w-12 text-gray-400" />
                  </div>
                )}
                
                {/* Overlay badges */}
                <div className="absolute top-2 left-2 space-y-1">
                  <Badge variant="secondary" className="text-xs">
                    {product.category}
                  </Badge>
                  {product.mockup_stats.total_mockups > 0 && (
                    <Badge variant="outline" className="text-xs bg-white">
                      {product.mockup_stats.total_mockups} mockups
                    </Badge>
                  )}
                </div>

                <div className="absolute top-2 right-2">
                  {getPriceTrendIcon(product.pricing_stats)}
                </div>
              </div>

              <CardContent className="p-4">
                <div className="space-y-2">
                  <div>
                    <h3 className="font-semibold truncate">{product.name}</h3>
                    <p className="text-sm text-gray-600 truncate">{product.description}</p>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-1">
                      <DollarSign className="h-4 w-4 text-green-600" />
                      <span className="font-medium text-green-600">
                        {formatPrice(product.pricing_stats.current_price)}
                      </span>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {product.sku}
                    </Badge>
                  </div>

                  {product.metadata.tags.length > 0 && (
                    <div className="flex items-center space-x-1">
                      <Tag className="h-3 w-3 text-gray-400" />
                      <div className="flex flex-wrap gap-1">
                        {product.metadata.tags.slice(0, 3).map((tag, i) => (
                          <Badge key={i} variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                        {product.metadata.tags.length > 3 && (
                          <span className="text-xs text-gray-500">+{product.metadata.tags.length - 3}</span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="divide-y">
              {products.map((product) => (
                <div 
                  key={product.id}
                  className="p-4 hover:bg-gray-50 cursor-pointer"
                  onClick={() => handleProductClick(product)}
                >
                  <div className="flex items-center space-x-4">
                    <div className="w-16 h-16 flex-shrink-0">
                      {product.mockup_stats.latest_mockup ? (
                        <ProductImage
                          src={product.mockup_stats.latest_mockup.image_url}
                          alt={product.name}
                          className="w-full h-full object-cover rounded-lg"
                        />
                      ) : (
                        <div className="w-full h-full bg-gray-100 rounded-lg flex items-center justify-center">
                          <ImageIcon className="h-6 w-6 text-gray-400" />
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-semibold truncate">{product.name}</h3>
                          <p className="text-sm text-gray-600 truncate">{product.description}</p>
                        </div>
                        <div className="text-right">
                          <div className="flex items-center space-x-1">
                            {getPriceTrendIcon(product.pricing_stats)}
                            <span className="font-medium text-green-600">
                              {formatPrice(product.pricing_stats.current_price)}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500">{product.sku}</p>
                        </div>
                      </div>

                      <div className="mt-2 flex items-center space-x-4 text-sm text-gray-500">
                        <Badge variant="secondary">{product.category}</Badge>
                        <span className="flex items-center">
                          <ImageIcon className="h-4 w-4 mr-1" />
                          {product.mockup_stats.total_mockups}
                        </span>
                        <span className="flex items-center">
                          <Calendar className="h-4 w-4 mr-1" />
                          {formatDate(product.created_at)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Product Detail Dialog */}
      {selectedProduct && (
        <Dialog open={!!selectedProduct} onOpenChange={() => setSelectedProduct(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center space-x-2">
                <span>{selectedProduct.name}</span>
                <Badge variant="secondary">{selectedProduct.sku}</Badge>
              </DialogTitle>
            </DialogHeader>

            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="pricing">Pricing</TabsTrigger>
                <TabsTrigger value="mockups">Mockups</TabsTrigger>
                <TabsTrigger value="specifications">Specs</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-4">
                <Card>
                  <CardContent className="p-6">
                    <div className="grid md:grid-cols-2 gap-6">
                      <div>
                        <h3 className="font-semibold mb-2">Product Details</h3>
                        <div className="space-y-2 text-sm">
                          <div><strong>Category:</strong> {selectedProduct.category}</div>
                          <div><strong>Sport:</strong> {selectedProduct.sport || 'N/A'}</div>
                          <div><strong>Description:</strong> {selectedProduct.description}</div>
                          <div><strong>Created:</strong> {formatDate(selectedProduct.created_at)}</div>
                          <div><strong>Status:</strong> 
                            <Badge className="ml-2" variant={selectedProduct.status === 'active' ? 'default' : 'secondary'}>
                              {selectedProduct.status}
                            </Badge>
                          </div>
                        </div>
                      </div>

                      <div>
                        <h3 className="font-semibold mb-2">Pricing Summary</h3>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span>Current Price:</span>
                            <span className="font-medium">{formatPrice(selectedProduct.pricing_stats.current_price)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Price Range:</span>
                            <span>{formatPrice(selectedProduct.pricing_stats.min_price)} - {formatPrice(selectedProduct.pricing_stats.max_price)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Price Changes:</span>
                            <span>{selectedProduct.pricing_stats.price_changes}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="pricing" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Pricing History</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-600">Pricing history details would be loaded here...</p>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="mockups" className="space-y-4">
                <ProductMockupUploader 
                  productId={selectedProduct.id}
                  onUploadSuccess={() => {
                    // Refresh product data
                    refetch();
                  }}
                />
              </TabsContent>

              <TabsContent value="specifications" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Product Specifications</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid md:grid-cols-2 gap-6">
                      {selectedProduct.metadata.sizes.length > 0 && (
                        <div>
                          <h4 className="font-medium mb-2">Available Sizes</h4>
                          <div className="flex flex-wrap gap-1">
                            {selectedProduct.metadata.sizes.map((size, i) => (
                              <Badge key={i} variant="outline">{size}</Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {selectedProduct.metadata.colors.length > 0 && (
                        <div>
                          <h4 className="font-medium mb-2">Available Colors</h4>
                          <div className="flex flex-wrap gap-1">
                            {selectedProduct.metadata.colors.map((color, i) => (
                              <Badge key={i} variant="outline">{color}</Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {Object.keys(selectedProduct.metadata.specifications).length > 0 && (
                      <div className="mt-6">
                        <h4 className="font-medium mb-2">Technical Specifications</h4>
                        <div className="space-y-1 text-sm">
                          {Object.entries(selectedProduct.metadata.specifications).map(([key, value]) => (
                            <div key={key} className="flex justify-between">
                              <span className="capitalize">{key.replace('_', ' ')}:</span>
                              <span>{String(value)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}