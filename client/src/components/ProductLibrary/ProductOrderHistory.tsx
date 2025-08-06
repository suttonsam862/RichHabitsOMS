/**
 * PRODUCT ORDER HISTORY COMPONENT
 * Displays detailed order history with count, color, size information
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
  ShoppingCart, 
  TrendingUp,
  Calendar,
  Package,
  Filter,
  Search,
  BarChart3,
  Palette,
  Ruler,
  Hash
} from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { formatDate } from '@/utils/dateFormatting';

interface OrderHistoryItem {
  id: string;
  order_id: string;
  order_date: string;
  customer_name: string;
  customer_id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  size: string;
  color: string;
  customization_details?: string;
  order_status: string;
  delivery_date?: string;
  season?: string;
}

interface OrderStats {
  total_orders: number;
  total_quantity: number;
  total_revenue: number;
  average_order_size: number;
  popular_sizes: Array<{ size: string; count: number }>;
  popular_colors: Array<{ color: string; count: number }>;
  monthly_trends: Array<{ month: string; orders: number; revenue: number }>;
  seasonal_data: Array<{ season: string; count: number }>;
}

interface ProductOrderHistoryProps {
  productId: string;
  className?: string;
}

export function ProductOrderHistory({ 
  productId, 
  className = '' 
}: ProductOrderHistoryProps) {
  const [filters, setFilters] = useState({
    search: '',
    date_range: '',
    size: '',
    color: '',
    status: '',
    sort_by: 'order_date',
    sort_order: 'desc',
    limit: '50'
  });

  const [activeTab, setActiveTab] = useState<'orders' | 'analytics'>('orders');

  // Fetch order history
  const { data: ordersData, isLoading: ordersLoading, error } = useQuery({
    queryKey: ['/api/products/library', productId, 'order-history', filters],
    queryFn: async () => {
      const queryParams = new URLSearchParams({
        ...filters,
        include_customer_info: 'true'
      }).toString();
      
      const response = await apiRequest('GET', `/api/products/library/${productId}/order-history?${queryParams}`);
      if (!response.ok) throw new Error('Failed to fetch order history');
      
      const result = await response.json();
      return result.data;
    },
    staleTime: 5 * 60 * 1000,
    enabled: !!productId,
  });

  // Fetch analytics data
  const { data: analyticsData, isLoading: analyticsLoading } = useQuery({
    queryKey: ['/api/products/library', productId, 'analytics'],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/products/library/${productId}/analytics`);
      if (!response.ok) throw new Error('Failed to fetch analytics');
      
      const result = await response.json();
      return result.data;
    },
    staleTime: 10 * 60 * 1000,
    enabled: !!productId,
  });

  const orders = ordersData?.orders || [];
  const stats: OrderStats = analyticsData?.stats || {};

  const updateFilter = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const formatPrice = (price: number) => `$${price.toFixed(2)}`;
  const formatNumber = (num: number) => num.toLocaleString();

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'shipped': return 'bg-blue-100 text-blue-800';
      case 'processing': return 'bg-yellow-100 text-yellow-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <ShoppingCart className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">Failed to load order history</p>
          <Button variant="outline" onClick={() => window.location.reload()}>
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header with Tabs */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center">
            <ShoppingCart className="mr-2 h-6 w-6" />
            Order History
          </h2>
          <p className="text-gray-600">
            {ordersLoading ? 'Loading...' : `${orders.length} orders found`}
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <Button
            variant={activeTab === 'orders' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveTab('orders')}
          >
            Orders
          </Button>
          <Button
            variant={activeTab === 'analytics' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveTab('analytics')}
          >
            <BarChart3 className="h-4 w-4 mr-2" />
            Analytics
          </Button>
        </div>
      </div>

      {activeTab === 'orders' ? (
        <>
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
                  <label className="text-sm font-medium mb-1 block">Search Customer</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search customers..."
                      value={filters.search}
                      onChange={(e) => updateFilter('search', e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium mb-1 block">Size</label>
                  <Select value={filters.size} onValueChange={(value) => updateFilter('size', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Sizes" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All Sizes</SelectItem>
                      {stats.popular_sizes?.map((item) => (
                        <SelectItem key={item.size} value={item.size}>
                          {item.size} ({item.count})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium mb-1 block">Color</label>
                  <Select value={filters.color} onValueChange={(value) => updateFilter('color', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Colors" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All Colors</SelectItem>
                      {stats.popular_colors?.map((item) => (
                        <SelectItem key={item.color} value={item.color}>
                          {item.color} ({item.count})
                        </SelectItem>
                      ))}
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
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="shipped">Shipped</SelectItem>
                      <SelectItem value="processing">Processing</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Orders List */}
          {ordersLoading ? (
            <div className="space-y-4">
              {Array(5).fill(0).map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-48" />
                        <Skeleton className="h-3 w-32" />
                      </div>
                      <Skeleton className="h-6 w-20" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : orders.length === 0 ? (
            // Empty State
            <Card className="p-12">
              <div className="text-center">
                <ShoppingCart className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No orders found</h3>
                <p className="text-gray-500 mb-4">
                  {filters.search || filters.size || filters.color || filters.status ? 
                    'Try adjusting your filters to see more results.' : 
                    'This product has not been ordered yet.'
                  }
                </p>
                {(filters.search || filters.size || filters.color || filters.status) && (
                  <Button 
                    variant="outline" 
                    onClick={() => setFilters({
                      search: '', date_range: '', size: '', color: '', status: '',
                      sort_by: 'order_date', sort_order: 'desc', limit: '50'
                    })}
                  >
                    Clear Filters
                  </Button>
                )}
              </div>
            </Card>
          ) : (
            <div className="space-y-4">
              {orders.map((order) => (
                <Card key={order.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center space-x-3">
                          <h4 className="font-medium">Order #{order.order_id}</h4>
                          <Badge 
                            className={getStatusColor(order.order_status)}
                            variant="secondary"
                          >
                            {order.order_status}
                          </Badge>
                        </div>

                        <div className="flex items-center space-x-6 text-sm text-gray-600">
                          <span className="flex items-center">
                            <Calendar className="h-4 w-4 mr-1" />
                            {formatDate(order.order_date)}
                          </span>
                          <span className="font-medium">{order.customer_name}</span>
                          <span className="flex items-center">
                            <Hash className="h-4 w-4 mr-1" />
                            {order.quantity} units
                          </span>
                        </div>

                        <div className="flex items-center space-x-4 text-sm">
                          <div className="flex items-center space-x-2">
                            <Ruler className="h-4 w-4 text-gray-400" />
                            <span>Size: <strong>{order.size}</strong></span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Palette className="h-4 w-4 text-gray-400" />
                            <span>Color: <strong>{order.color}</strong></span>
                          </div>
                          {order.customization_details && (
                            <div className="text-gray-500">
                              Custom: {order.customization_details}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-2xl font-bold text-green-600">
                          {formatPrice(order.total_price)}
                        </div>
                        <div className="text-sm text-gray-500">
                          {formatPrice(order.unit_price)} each
                        </div>
                        {order.delivery_date && (
                          <div className="text-xs text-gray-500 mt-1">
                            Delivered: {formatDate(order.delivery_date)}
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      ) : (
        // Analytics Tab
        <div className="space-y-6">
          {analyticsLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {Array(8).fill(0).map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-6">
                    <Skeleton className="h-16 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <>
              {/* Key Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-6">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-blue-600 mb-2">
                        {formatNumber(stats.total_orders || 0)}
                      </div>
                      <div className="text-sm text-gray-500">Total Orders</div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-green-600 mb-2">
                        {formatNumber(stats.total_quantity || 0)}
                      </div>
                      <div className="text-sm text-gray-500">Units Sold</div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-purple-600 mb-2">
                        {formatPrice(stats.total_revenue || 0)}
                      </div>
                      <div className="text-sm text-gray-500">Total Revenue</div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-orange-600 mb-2">
                        {stats.average_order_size ? stats.average_order_size.toFixed(1) : '0'}
                      </div>
                      <div className="text-sm text-gray-500">Avg Order Size</div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Popular Sizes & Colors */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Ruler className="mr-2 h-5 w-5" />
                      Popular Sizes
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {stats.popular_sizes?.slice(0, 10).map((item, index) => (
                        <div key={item.size} className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <Badge variant="outline">{item.size}</Badge>
                            <span className="text-sm text-gray-600">
                              #{index + 1}
                            </span>
                          </div>
                          <div className="text-right">
                            <div className="font-medium">{formatNumber(item.count)}</div>
                            <div className="text-xs text-gray-500">
                              {stats.total_quantity ? 
                                `${((item.count / stats.total_quantity) * 100).toFixed(1)}%` : 
                                '0%'
                              }
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Palette className="mr-2 h-5 w-5" />
                      Popular Colors
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {stats.popular_colors?.slice(0, 10).map((item, index) => (
                        <div key={item.color} className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <Badge variant="outline">{item.color}</Badge>
                            <span className="text-sm text-gray-600">
                              #{index + 1}
                            </span>
                          </div>
                          <div className="text-right">
                            <div className="font-medium">{formatNumber(item.count)}</div>
                            <div className="text-xs text-gray-500">
                              {stats.total_quantity ? 
                                `${((item.count / stats.total_quantity) * 100).toFixed(1)}%` : 
                                '0%'
                              }
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Monthly Trends */}
              {stats.monthly_trends && stats.monthly_trends.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <TrendingUp className="mr-2 h-5 w-5" />
                      Monthly Trends (Last 12 Months)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {stats.monthly_trends.map((month) => (
                        <div key={month.month} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="font-medium">{month.month}</div>
                          <div className="text-right">
                            <div className="font-bold text-green-600">
                              {formatPrice(month.revenue)}
                            </div>
                            <div className="text-sm text-gray-500">
                              {formatNumber(month.orders)} orders
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Seasonal Data */}
              {stats.seasonal_data && stats.seasonal_data.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Calendar className="mr-2 h-5 w-5" />
                      Seasonal Performance
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {stats.seasonal_data.map((season) => (
                        <div key={season.season} className="text-center p-4 bg-gray-50 rounded-lg">
                          <div className="text-2xl font-bold text-blue-600 mb-1">
                            {formatNumber(season.count)}
                          </div>
                          <div className="text-sm font-medium capitalize">
                            {season.season}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}