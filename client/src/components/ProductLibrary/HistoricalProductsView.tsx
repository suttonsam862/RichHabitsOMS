/**
 * HISTORICAL PRODUCTS VIEW COMPONENT
 * Displays historical products with enhanced filtering and analytics
 */

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  CalendarDays, 
  TrendingUp, 
  TrendingDown, 
  Minus,
  Package,
  History,
  Filter,
  Search
} from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { ProductImage } from '@/components/ui/FallbackImage';
import { formatDate } from '@/utils/dateFormatting';

interface HistoricalProduct {
  id: string;
  name: string;
  sku: string;
  category: string;
  sport?: string;
  description: string;
  created_at: string;
  last_modified: string;
  status: 'active' | 'discontinued' | 'archived';
  pricing_stats: {
    current_price: number;
    historical_avg: number;
    price_trend: 'increasing' | 'decreasing' | 'stable';
    price_changes: number;
  };
  order_stats: {
    total_orders: number;
    total_quantity: number;
    popular_sizes: string[];
    popular_colors: string[];
    last_ordered: string | null;
  };
  mockup_stats: {
    total_mockups: number;
    latest_mockup?: {
      image_url: string;
      created_at: string;
    };
  };
  lifecycle_stage: 'new' | 'mature' | 'declining' | 'discontinued';
}

interface HistoricalProductsViewProps {
  onProductSelect?: (product: HistoricalProduct) => void;
  className?: string;
}

export function HistoricalProductsView({ 
  onProductSelect, 
  className = '' 
}: HistoricalProductsViewProps) {
  const [filters, setFilters] = useState({
    search: '',
    category: '',
    status: '',
    lifecycle_stage: '',
    sort_by: 'last_modified',
    sort_order: 'desc',
    limit: '50'
  });

  // Fetch historical products data
  const { data: productsData, isLoading, error } = useQuery({
    queryKey: ['/api/products/library', 'historical', filters],
    queryFn: async () => {
      const queryParams = new URLSearchParams({
        ...filters,
        include_stats: 'true',
        include_lifecycle: 'true'
      }).toString();
      
      const response = await apiRequest('GET', `/api/products/library?${queryParams}`);
      if (!response.ok) throw new Error('Failed to fetch historical products');
      
      const result = await response.json();
      return result.data;
    },
    staleTime: 5 * 60 * 1000,
  });

  // Fetch summary statistics
  const { data: statsData } = useQuery({
    queryKey: ['/api/products/library/stats'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/products/library/stats');
      if (!response.ok) throw new Error('Failed to fetch stats');
      return response.json();
    },
  });

  const products = productsData?.products || [];
  const stats = statsData?.data || {};

  const updateFilter = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const getPriceTrendIcon = (trend: string) => {
    switch (trend) {
      case 'increasing': return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'decreasing': return <TrendingDown className="h-4 w-4 text-red-500" />;
      default: return <Minus className="h-4 w-4 text-gray-400" />;
    }
  };

  const getLifecycleColor = (stage: string) => {
    switch (stage) {
      case 'new': return 'bg-blue-100 text-blue-800';
      case 'mature': return 'bg-green-100 text-green-800';
      case 'declining': return 'bg-yellow-100 text-yellow-800';
      case 'discontinued': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatPrice = (price: number) => `$${price.toFixed(2)}`;

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Package className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">Failed to load historical products</p>
          <Button variant="outline" onClick={() => window.location.reload()}>
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header and Stats */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center">
            <History className="mr-2 h-6 w-6" />
            Historical Products
          </h2>
          <p className="text-gray-600">
            {isLoading ? 'Loading...' : `${products.length} products in library`}
          </p>
        </div>

        {/* Quick Stats */}
        {stats && (
          <div className="grid grid-cols-3 gap-4">
            <Card className="p-3">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{stats.total_products}</div>
                <div className="text-xs text-gray-500">Total Products</div>
              </div>
            </Card>
            <Card className="p-3">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{stats.active_products}</div>
                <div className="text-xs text-gray-500">Active</div>
              </div>
            </Card>
            <Card className="p-3">
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">{stats.discontinued_products}</div>
                <div className="text-xs text-gray-500">Discontinued</div>
              </div>
            </Card>
          </div>
        )}
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center text-lg">
            <Filter className="mr-2 h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search products..."
                  value={filters.search}
                  onChange={(e) => updateFilter('search', e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">Category</label>
              <Select value={filters.category} onValueChange={(value) => updateFilter('category', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Categories</SelectItem>
                  <SelectItem value="Jerseys">Jerseys</SelectItem>
                  <SelectItem value="Shorts">Shorts</SelectItem>
                  <SelectItem value="Accessories">Accessories</SelectItem>
                  <SelectItem value="Footwear">Footwear</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">Status</label>
              <Select value={filters.status} onValueChange={(value) => updateFilter('status', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Statuses</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="discontinued">Discontinued</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">Sort By</label>
              <Select value={filters.sort_by} onValueChange={(value) => updateFilter('sort_by', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="last_modified">Last Modified</SelectItem>
                  <SelectItem value="created_at">Created Date</SelectItem>
                  <SelectItem value="name">Name</SelectItem>
                  <SelectItem value="total_orders">Order Count</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Products Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array(8).fill(0).map((_, i) => (
            <Card key={i}>
              <Skeleton className="h-48 w-full" />
              <CardContent className="p-4">
                <Skeleton className="h-4 w-3/4 mb-2" />
                <Skeleton className="h-3 w-1/2 mb-2" />
                <Skeleton className="h-3 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : products.length === 0 ? (
        // Empty State
        <Card className="p-12">
          <div className="text-center">
            <Package className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No products found</h3>
            <p className="text-gray-500 mb-4">
              {filters.search || filters.category || filters.status ? 
                'Try adjusting your filters to see more results.' : 
                'Your product library is empty. Start by adding your first product.'
              }
            </p>
            {(filters.search || filters.category || filters.status) && (
              <Button 
                variant="outline" 
                onClick={() => setFilters({
                  search: '', category: '', status: '', lifecycle_stage: '',
                  sort_by: 'last_modified', sort_order: 'desc', limit: '50'
                })}
              >
                Clear Filters
              </Button>
            )}
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {products.map((product) => (
            <Card 
              key={product.id} 
              className="cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => onProductSelect?.(product)}
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
                    <Package className="h-12 w-12 text-gray-400" />
                  </div>
                )}

                {/* Status badges */}
                <div className="absolute top-2 left-2 space-y-1">
                  <Badge 
                    className={`text-xs ${getLifecycleColor(product.lifecycle_stage)}`}
                    variant="secondary"
                  >
                    {product.lifecycle_stage}
                  </Badge>
                  {product.status !== 'active' && (
                    <Badge variant="secondary" className="text-xs bg-red-100 text-red-800">
                      {product.status}
                    </Badge>
                  )}
                </div>

                {/* Price trend */}
                <div className="absolute top-2 right-2">
                  {getPriceTrendIcon(product.pricing_stats.price_trend)}
                </div>
              </div>

              <CardContent className="p-4">
                <div className="space-y-2">
                  <div>
                    <h3 className="font-semibold truncate">{product.name}</h3>
                    <p className="text-sm text-gray-600 truncate">{product.description}</p>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <Badge variant="outline">{product.category}</Badge>
                    <span className="text-gray-500">{product.sku}</span>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center space-x-1">
                      <span className="text-green-600 font-medium">
                        {formatPrice(product.pricing_stats.current_price)}
                      </span>
                      {product.pricing_stats.price_changes > 0 && (
                        <span className="text-xs text-gray-400">
                          ({product.pricing_stats.price_changes} changes)
                        </span>
                      )}
                    </div>
                    <div className="text-gray-500">
                      {product.order_stats.total_orders} orders
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <div className="flex items-center">
                      <CalendarDays className="h-3 w-3 mr-1" />
                      {formatDate(product.last_modified)}
                    </div>
                    <div>
                      {product.mockup_stats.total_mockups} mockups
                    </div>
                  </div>

                  {/* Popular sizes and colors */}
                  {(product.order_stats.popular_sizes.length > 0 || product.order_stats.popular_colors.length > 0) && (
                    <div className="pt-2 border-t">
                      {product.order_stats.popular_sizes.length > 0 && (
                        <div className="mb-1">
                          <span className="text-xs text-gray-500">Popular sizes: </span>
                          <span className="text-xs">
                            {product.order_stats.popular_sizes.slice(0, 3).join(', ')}
                          </span>
                        </div>
                      )}
                      {product.order_stats.popular_colors.length > 0 && (
                        <div>
                          <span className="text-xs text-gray-500">Popular colors: </span>
                          <span className="text-xs">
                            {product.order_stats.popular_colors.slice(0, 3).join(', ')}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}