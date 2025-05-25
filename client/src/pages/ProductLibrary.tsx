import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  Search, 
  Plus, 
  Copy, 
  TrendingUp, 
  Package, 
  Clock, 
  DollarSign,
  History,
  Filter
} from 'lucide-react';

interface Product {
  id: number;
  product_name: string;
  description: string;
  category: string;
  base_price: number;
  material: string;
  available_sizes: string[];
  available_colors: string[];
  supplier: string;
  lead_time_days: number;
  minimum_quantity: number;
  tags: string[];
  total_times_ordered: number;
  last_ordered_date: string;
  pricing_stats: {
    min_price: number;
    max_price: number;
    avg_price: number;
    total_orders: number;
    last_price: number;
  };
}

interface PricingHistory {
  id: number;
  unit_price: number;
  quantity_ordered: number;
  pricing_date: string;
  notes: string;
  orders?: {
    order_number: string;
    status: string;
  };
  customers?: {
    first_name: string;
    last_name: string;
  };
}

export default function ProductLibrary() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showPricingHistory, setShowPricingHistory] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch products
  const { data: productsData, isLoading: loadingProducts } = useQuery({
    queryKey: ['/api/products/library', { search: searchTerm, category: selectedCategory }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (selectedCategory) params.append('category', selectedCategory);
      
      const response = await apiRequest('GET', `/api/products/library?${params}`);
      if (!response.ok) throw new Error('Failed to fetch products');
      return response.json();
    },
  });

  // Fetch categories
  const { data: categoriesData } = useQuery({
    queryKey: ['/api/products/categories'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/products/categories');
      if (!response.ok) throw new Error('Failed to fetch categories');
      return response.json();
    },
  });

  // Fetch pricing history for selected product
  const { data: pricingData, isLoading: loadingPricing } = useQuery({
    queryKey: ['/api/products/library', selectedProduct?.id, 'pricing-history'],
    queryFn: async () => {
      if (!selectedProduct) return null;
      const response = await apiRequest('GET', `/api/products/library/${selectedProduct.id}/pricing-history`);
      if (!response.ok) throw new Error('Failed to fetch pricing history');
      return response.json();
    },
    enabled: !!selectedProduct && showPricingHistory,
  });

  // Copy product to order
  const copyProductMutation = useMutation({
    mutationFn: async ({ productId, quantity }: { productId: number; quantity: number }) => {
      const response = await apiRequest('POST', `/api/products/library/${productId}/copy`, {
        quantity,
      });
      if (!response.ok) throw new Error('Failed to copy product');
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: 'Product Copied!',
        description: `${data.order_item.product_name} is ready to add to your order`,
        variant: 'default',
      });
      // You could navigate to order creation page here
    },
    onError: (error: Error) => {
      toast({
        title: 'Copy Failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const products = productsData?.products || [];
  const categories = categoriesData?.categories || [];

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Product Library</h1>
          <p className="text-muted-foreground">
            Browse products, reference pricing, and copy items to new orders
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add Product
        </Button>
      </div>

      {/* Search and Filters */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Filter className="mr-2 h-5 w-5" />
            Search & Filter
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search products, descriptions, or tags..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Categories</SelectItem>
                {categories.map((category: string) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Products Grid */}
      {loadingProducts ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="h-3 bg-gray-200 rounded"></div>
                  <div className="h-3 bg-gray-200 rounded w-5/6"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map((product: Product) => (
            <Card key={product.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{product.product_name}</CardTitle>
                    <CardDescription>{product.description}</CardDescription>
                  </div>
                  <Badge variant="secondary">{product.category}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Pricing Information */}
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="flex items-center text-muted-foreground">
                        <DollarSign className="mr-1 h-3 w-3" />
                        Base Price
                      </div>
                      <div className="font-semibold">${product.base_price}</div>
                    </div>
                    <div>
                      <div className="flex items-center text-muted-foreground">
                        <TrendingUp className="mr-1 h-3 w-3" />
                        Avg Price
                      </div>
                      <div className="font-semibold">${product.pricing_stats.avg_price.toFixed(2)}</div>
                    </div>
                    <div>
                      <div className="flex items-center text-muted-foreground">
                        <Package className="mr-1 h-3 w-3" />
                        Times Ordered
                      </div>
                      <div className="font-semibold">{product.total_times_ordered || 0}</div>
                    </div>
                    <div>
                      <div className="flex items-center text-muted-foreground">
                        <Clock className="mr-1 h-3 w-3" />
                        Lead Time
                      </div>
                      <div className="font-semibold">{product.lead_time_days || 'N/A'} days</div>
                    </div>
                  </div>

                  {/* Available Options */}
                  <div className="space-y-2">
                    {product.available_sizes && product.available_sizes.length > 0 && (
                      <div>
                        <div className="text-xs text-muted-foreground mb-1">Sizes:</div>
                        <div className="flex flex-wrap gap-1">
                          {product.available_sizes.slice(0, 4).map((size) => (
                            <Badge key={size} variant="outline" className="text-xs">
                              {size}
                            </Badge>
                          ))}
                          {product.available_sizes.length > 4 && (
                            <Badge variant="outline" className="text-xs">
                              +{product.available_sizes.length - 4} more
                            </Badge>
                          )}
                        </div>
                      </div>
                    )}
                    
                    {product.available_colors && product.available_colors.length > 0 && (
                      <div>
                        <div className="text-xs text-muted-foreground mb-1">Colors:</div>
                        <div className="flex flex-wrap gap-1">
                          {product.available_colors.slice(0, 3).map((color) => (
                            <Badge key={color} variant="outline" className="text-xs">
                              {color}
                            </Badge>
                          ))}
                          {product.available_colors.length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{product.available_colors.length - 3} more
                            </Badge>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2 pt-2">
                    <Button
                      size="sm"
                      onClick={() => copyProductMutation.mutate({ productId: product.id, quantity: 1 })}
                      disabled={copyProductMutation.isPending}
                      className="flex-1"
                    >
                      <Copy className="mr-1 h-3 w-3" />
                      Copy to Order
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSelectedProduct(product);
                        setShowPricingHistory(true);
                      }}
                    >
                      <History className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {products.length === 0 && !loadingProducts && (
        <Card>
          <CardContent className="text-center py-12">
            <Package className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Products Found</h3>
            <p className="text-muted-foreground mb-4">
              {searchTerm || selectedCategory
                ? 'Try adjusting your search or filter criteria'
                : 'Start building your product library by adding products'}
            </p>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add First Product
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Pricing History Modal */}
      <Dialog open={showPricingHistory} onOpenChange={setShowPricingHistory}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>
              Pricing History: {selectedProduct?.product_name}
            </DialogTitle>
            <DialogDescription>
              Historical pricing data to help with quotes and negotiations
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-96 overflow-y-auto">
            {loadingPricing ? (
              <div className="text-center py-8">Loading pricing history...</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Order</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pricingData?.pricing_history?.map((item: PricingHistory) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        {new Date(item.pricing_date).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="font-semibold">
                        ${parseFloat(item.unit_price.toString()).toFixed(2)}
                      </TableCell>
                      <TableCell>{item.quantity_ordered}</TableCell>
                      <TableCell>
                        {item.orders?.order_number || 'N/A'}
                      </TableCell>
                      <TableCell>
                        {item.customers 
                          ? `${item.customers.first_name} ${item.customers.last_name}`
                          : 'N/A'
                        }
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {item.notes || '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPricingHistory(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}