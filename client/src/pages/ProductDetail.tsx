import React from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { ProductImage } from '@/components/ui/FallbackImage';
import { 
  Calendar, 
  Package, 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  Minus,
  ImageIcon,
  Palette,
  Ruler,
  Tag,
  User,
  Building,
  Clock,
  Eye,
  ArrowLeft
} from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { useAuth } from '@/hooks/use-auth';
import { MockupGallery } from '@/components/MockupGallery';

interface ProductDetailData {
  id: string;
  name: string;
  description: string;
  category: string;
  sport: string;
  sku: string;
  status: string;
  base_price: string;
  unit_cost: string;
  eta_days: string;
  fabric: string;
  created_at: string;
  updated_at: string;
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
  pricing_history: Array<{
    id: string;
    old_base_price: string;
    new_base_price: string;
    old_unit_cost: string;
    new_unit_cost: string;
    reason: string;
    created_at: string;
    changed_by: string;
  }>;
  mockups: Array<{
    id: string;
    image_url: string;
    image_type: string;
    alt_text: string;
    upload_timestamp: string;
    metadata: any;
    is_active: boolean;
  }>;
  user_profiles?: {
    id: string;
    username: string;
    first_name: string;
    last_name: string;
  };
}

export default function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();

  // Redirect if not authenticated
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Redirect if no product ID
  if (!id) {
    return <Navigate to="/catalog" replace />;
  }

  // Fetch product details
  const { data: productData, isLoading, error } = useQuery({
    queryKey: ['/api/products/library', id],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/products/library/${id}`);
      if (!response.ok) {
        throw new Error('Failed to fetch product details');
      }
      const result = await response.json();
      return result.data as ProductDetailData;
    },
  });

  // Fetch pricing history separately
  const { data: pricingHistoryData } = useQuery({
    queryKey: ['/api/products/library', id, 'pricing-history'],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/products/library/${id}/pricing-history`);
      if (!response.ok) {
        throw new Error('Failed to fetch pricing history');
      }
      const result = await response.json();
      return result.data;
    },
    enabled: !!id,
  });

  const formatPrice = (price: number | string) => {
    const numPrice = typeof price === 'string' ? parseFloat(price) : price;
    return `$${numPrice.toFixed(2)}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getPriceTrendIcon = (stats: ProductDetailData['pricing_stats']) => {
    if (stats.price_changes === 0) return <Minus className="h-4 w-4 text-gray-400" />;
    if (stats.current_price > stats.avg_price) return <TrendingUp className="h-4 w-4 text-green-500" />;
    return <TrendingDown className="h-4 w-4 text-red-500" />;
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'active': return 'default';
      case 'inactive': return 'secondary';
      case 'discontinued': return 'destructive';
      default: return 'secondary';
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="mb-6">
          <Skeleton className="h-8 w-64 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-32" />
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              </CardContent>
            </Card>
          </div>
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-32 w-full" />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  if (error || !productData) {
    return (
      <div className="container mx-auto px-4 py-6">
        <Card className="p-6">
          <div className="text-center">
            <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Product Not Found</h2>
            <p className="text-gray-600 mb-4">
              The product you're looking for doesn't exist or you don't have permission to view it.
            </p>
            <Button onClick={() => window.history.back()}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Go Back
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center space-x-2 mb-4">
          <Button variant="ghost" size="sm" onClick={() => window.history.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{productData.name}</h1>
            <div className="flex items-center space-x-3">
              <Badge variant="secondary">{productData.sku}</Badge>
              <Badge variant={getStatusBadgeVariant(productData.status)}>
                {productData.status}
              </Badge>
              <span className="text-gray-500">•</span>
              <span className="text-gray-600">{productData.category}</span>
              {productData.sport && productData.sport !== 'All Around Item' && (
                <>
                  <span className="text-gray-500">•</span>
                  <span className="text-gray-600">{productData.sport}</span>
                </>
              )}
            </div>
          </div>
          <div className="text-right">
            <div className="flex items-center space-x-1 mb-1">
              {getPriceTrendIcon(productData.pricing_stats)}
              <span className="text-2xl font-bold text-green-600">
                {formatPrice(productData.pricing_stats.current_price)}
              </span>
            </div>
            <p className="text-sm text-gray-500">Current Price</p>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2">
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="pricing">Pricing</TabsTrigger>
              <TabsTrigger value="mockups">Images</TabsTrigger>
              <TabsTrigger value="specifications">Specs</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6 mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Package className="h-5 w-5" />
                    <span>Product Details</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Description</h4>
                    <p className="text-gray-600">
                      {productData.description || 'No description available'}
                    </p>
                  </div>
                  
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Product Information</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">SKU:</span>
                          <span className="font-medium">{productData.sku}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Category:</span>
                          <span className="font-medium">{productData.category}</span>
                        </div>
                        {productData.fabric && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">Fabric:</span>
                            <span className="font-medium">{productData.fabric}</span>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <span className="text-gray-600">Lead Time:</span>
                          <span className="font-medium">{productData.eta_days} days</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Unit Cost:</span>
                          <span className="font-medium">{formatPrice(productData.unit_cost)}</span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Availability</h4>
                      <div className="space-y-2 text-sm">
                        <div>
                          <span className="text-gray-600 block mb-1">Sizes:</span>
                          <div className="flex flex-wrap gap-1">
                            {productData.metadata.sizes.length > 0 ? (
                              productData.metadata.sizes.map((size, index) => (
                                <Badge key={index} variant="outline" className="text-xs">
                                  {size}
                                </Badge>
                              ))
                            ) : (
                              <span className="text-gray-500 text-xs">No sizes specified</span>
                            )}
                          </div>
                        </div>
                        <div>
                          <span className="text-gray-600 block mb-1">Colors:</span>
                          <div className="flex flex-wrap gap-1">
                            {productData.metadata.colors.length > 0 ? (
                              productData.metadata.colors.map((color, index) => (
                                <Badge key={index} variant="outline" className="text-xs">
                                  {color}
                                </Badge>
                              ))
                            ) : (
                              <span className="text-gray-500 text-xs">No colors specified</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {productData.metadata.tags.length > 0 && (
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Tags</h4>
                      <div className="flex flex-wrap gap-2">
                        {productData.metadata.tags.map((tag, index) => (
                          <Badge key={index} variant="secondary" className="text-xs">
                            <Tag className="h-3 w-3 mr-1" />
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="pricing" className="space-y-6 mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <DollarSign className="h-5 w-5" />
                    <span>Pricing Overview</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-medium text-gray-900 mb-3">Current Pricing</h4>
                      <div className="space-y-2">
                        <div className="flex justify-between text-lg">
                          <span>Base Price:</span>
                          <span className="font-semibold text-green-600">
                            {formatPrice(productData.pricing_stats.current_price)}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm text-gray-600">
                          <span>Unit Cost:</span>
                          <span>{formatPrice(productData.unit_cost)}</span>
                        </div>
                        <div className="flex justify-between text-sm text-gray-600">
                          <span>Margin:</span>
                          <span>
                            {formatPrice(productData.pricing_stats.current_price - parseFloat(productData.unit_cost))}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-medium text-gray-900 mb-3">Price Statistics</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Min Price:</span>
                          <span>{formatPrice(productData.pricing_stats.min_price)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Max Price:</span>
                          <span>{formatPrice(productData.pricing_stats.max_price)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Avg Price:</span>
                          <span>{formatPrice(productData.pricing_stats.avg_price)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Price Changes:</span>
                          <span>{productData.pricing_stats.price_changes}</span>
                        </div>
                        {productData.pricing_stats.last_price_change && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">Last Change:</span>
                            <span>{formatDate(productData.pricing_stats.last_price_change)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {productData.pricing_history.length > 0 && (
                    <div className="mt-6">
                      <h4 className="font-medium text-gray-900 mb-3">Recent Price Changes</h4>
                      <div className="space-y-3">
                        {productData.pricing_history.slice(0, 5).map((change) => (
                          <div key={change.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div className="flex items-center space-x-3">
                              <Clock className="h-4 w-4 text-gray-400" />
                              <div>
                                <div className="flex items-center space-x-2">
                                  <span className="font-medium">
                                    {formatPrice(change.old_base_price)} → {formatPrice(change.new_base_price)}
                                  </span>
                                  {parseFloat(change.new_base_price) > parseFloat(change.old_base_price) ? (
                                    <TrendingUp className="h-4 w-4 text-green-500" />
                                  ) : (
                                    <TrendingDown className="h-4 w-4 text-red-500" />
                                  )}
                                </div>
                                <p className="text-sm text-gray-600">{change.reason || 'No reason provided'}</p>
                              </div>
                            </div>
                            <div className="text-right text-sm text-gray-500">
                              <div>{formatDate(change.created_at)}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="mockups" className="space-y-6 mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <ImageIcon className="h-5 w-5" />
                    <span>Product Images</span>
                    <Badge variant="secondary" className="ml-2">
                      {productData.mockup_stats.total_mockups}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {productData.mockups.length > 0 ? (
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {productData.mockups.map((mockup) => (
                        <div key={mockup.id} className="group relative">
                          <div className="aspect-square overflow-hidden rounded-lg bg-gray-100 hover:shadow-md transition-shadow">
                            <ProductImage
                              src={mockup.image_url}
                              alt={mockup.alt_text || productData.name}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                          </div>
                          <div className="mt-2 space-y-1">
                            <div className="flex items-center justify-between">
                              <Badge variant="outline" className="text-xs">
                                {mockup.image_type}
                              </Badge>
                              <span className="text-xs text-gray-500">
                                {formatDate(mockup.upload_timestamp)}
                              </span>
                            </div>
                            {mockup.alt_text && (
                              <p className="text-xs text-gray-600 truncate">{mockup.alt_text}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <ImageIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="font-medium text-gray-900 mb-2">No Images Available</h3>
                      <p className="text-gray-600">No mockup images have been uploaded for this product yet.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="specifications" className="space-y-6 mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Ruler className="h-5 w-5" />
                    <span>Specifications</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {Object.keys(productData.metadata.specifications).length > 0 || 
                   productData.metadata.customization_options.length > 0 ? (
                    <div className="space-y-6">
                      {Object.keys(productData.metadata.specifications).length > 0 && (
                        <div>
                          <h4 className="font-medium text-gray-900 mb-3">Technical Specifications</h4>
                          <div className="grid md:grid-cols-2 gap-4">
                            {Object.entries(productData.metadata.specifications).map(([key, value]) => (
                              <div key={key} className="flex justify-between p-3 bg-gray-50 rounded-lg">
                                <span className="font-medium capitalize">{key.replace('_', ' ')}:</span>
                                <span className="text-gray-600">{String(value)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {productData.metadata.customization_options.length > 0 && (
                        <div>
                          <h4 className="font-medium text-gray-900 mb-3">Customization Options</h4>
                          <div className="flex flex-wrap gap-2">
                            {productData.metadata.customization_options.map((option, index) => (
                              <Badge key={index} variant="outline">
                                <Palette className="h-3 w-3 mr-1" />
                                {option}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Ruler className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="font-medium text-gray-900 mb-2">No Specifications Available</h3>
                      <p className="text-gray-600">No detailed specifications have been added for this product yet.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick Stats */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Quick Stats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Total Images:</span>
                <span className="font-medium">{productData.mockup_stats.total_mockups}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Price Changes:</span>
                <span className="font-medium">{productData.pricing_stats.price_changes}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Created:</span>
                <span className="font-medium">{formatDate(productData.created_at)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Last Updated:</span>
                <span className="font-medium">{formatDate(productData.updated_at)}</span>
              </div>
            </CardContent>
          </Card>

          {/* Latest Image */}
          {productData.mockup_stats.latest_mockup && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Latest Image</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="aspect-square overflow-hidden rounded-lg bg-gray-100">
                  <ProductImage
                    src={productData.mockup_stats.latest_mockup.image_url}
                    alt={productData.mockup_stats.latest_mockup.alt_text || productData.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="mt-3 space-y-1">
                  <Badge variant="outline" className="text-xs">
                    {productData.mockup_stats.latest_mockup.image_type}
                  </Badge>
                  <p className="text-xs text-gray-500">
                    {formatDate(productData.mockup_stats.latest_mockup.upload_timestamp)}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Preferred Manufacturer */}
          {productData.user_profiles && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center space-x-2">
                  <User className="h-4 w-4" />
                  <span>Preferred Manufacturer</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p className="font-medium">
                    {productData.user_profiles.first_name} {productData.user_profiles.last_name}
                  </p>
                  <p className="text-sm text-gray-600">@{productData.user_profiles.username}</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button className="w-full" variant="outline">
                <Eye className="h-4 w-4 mr-2" />
                View in Catalog
              </Button>
              {user?.role === 'admin' || user?.role === 'salesperson' && (
                <Button className="w-full" variant="outline">
                  Edit Product
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* MockupGallery Section */}
      <div className="mt-8">
        <MockupGallery 
          productId={productData.id} 
          productName={productData.name} 
          className="max-w-full"
        />
      </div>
    </div>
  );
}