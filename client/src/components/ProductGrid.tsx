import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { ProductImage } from '@/components/ui/FallbackImage';
import {
  Package,
  Search,
  Filter,
  Grid3X3,
  List,
  Eye,
  Tag,
  DollarSign,
  Calendar,
  Building2
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ProductGridItem {
  id: string;
  name: string;
  description?: string;
  category: string;
  sport?: string;
  sku: string;
  status: string;
  base_price: number | string;
  unit_cost?: number | string;
  fabric?: string;
  created_at: string;
  updated_at?: string;
  image_url?: string;
  primary_image?: string;
  metadata?: {
    sizes?: string[];
    colors?: string[];
    tags?: string[];
    specifications?: Record<string, any>;
  };
  mockup_stats?: {
    total_mockups: number;
    has_primary_image: boolean;
  };
  pricing_stats?: {
    current_price: number;
    min_price: number;
    max_price: number;
  };
}

export interface ProductGridProps {
  products: ProductGridItem[];
  isLoading?: boolean;
  error?: string;
  className?: string;
  showFilters?: boolean;
  showPagination?: boolean;
  itemsPerPage?: number;
  viewMode?: 'grid' | 'list';
  onViewModeChange?: (mode: 'grid' | 'list') => void;
  searchPlaceholder?: string;
  emptyStateTitle?: string;
  emptyStateDescription?: string;
  basePath?: string; // Base path for routing (e.g., '/products' or '/catalog')
}

export function ProductGrid({
  products = [],
  isLoading = false,
  error,
  className = '',
  showFilters = true,
  showPagination = true,
  itemsPerPage = 12,
  viewMode: externalViewMode,
  onViewModeChange,
  searchPlaceholder = 'Search products...',
  emptyStateTitle = 'No products found',
  emptyStateDescription = 'No products match your current filters.',
  basePath = '/products'
}: ProductGridProps) {
  const navigate = useNavigate();

  // Local state for filters and pagination
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [internalViewMode, setInternalViewMode] = useState<'grid' | 'list'>('grid');

  // Use external view mode if provided, otherwise use internal
  const viewMode = externalViewMode ?? internalViewMode;

  // Extract unique categories and statuses from products
  const { categories, statuses } = useMemo(() => {
    const cats = new Set<string>();
    const stats = new Set<string>();
    
    products.forEach(product => {
      if (product.category) cats.add(product.category);
      if (product.status) stats.add(product.status);
    });

    return {
      categories: Array.from(cats).sort(),
      statuses: Array.from(stats).sort()
    };
  }, [products]);

  // Filter products based on search and filters
  const filteredProducts = useMemo(() => {
    return products.filter(product => {
      // Search filter
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        const matchesSearch = 
          product.name.toLowerCase().includes(searchLower) ||
          product.sku.toLowerCase().includes(searchLower) ||
          product.description?.toLowerCase().includes(searchLower) ||
          product.metadata?.tags?.some(tag => tag.toLowerCase().includes(searchLower));
        
        if (!matchesSearch) return false;
      }

      // Category filter
      if (selectedCategory !== 'all' && product.category !== selectedCategory) {
        return false;
      }

      // Status filter
      if (selectedStatus !== 'all' && product.status !== selectedStatus) {
        return false;
      }

      return true;
    });
  }, [products, searchTerm, selectedCategory, selectedStatus]);

  // Pagination
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedProducts = filteredProducts.slice(startIndex, startIndex + itemsPerPage);

  // Reset to first page when filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedCategory, selectedStatus]);

  const handleViewModeChange = (mode: 'grid' | 'list') => {
    if (onViewModeChange) {
      onViewModeChange(mode);
    } else {
      setInternalViewMode(mode);
    }
  };

  const handleProductClick = (productId: string) => {
    navigate(`${basePath}/${productId}`);
  };

  const formatPrice = (price: number | string) => {
    const numPrice = typeof price === 'string' ? parseFloat(price) : price;
    return isNaN(numPrice) ? '$0.00' : `$${numPrice.toFixed(2)}`;
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return 'Unknown';
    }
  };

  const getStatusVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (status.toLowerCase()) {
      case 'active':
        return 'default';
      case 'inactive':
        return 'secondary';
      case 'discontinued':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  if (error) {
    return (
      <Card className={cn("w-full", className)}>
        <CardContent className="py-8 text-center">
          <Package className="h-12 w-12 mx-auto text-destructive mb-4" />
          <h3 className="text-lg font-semibold mb-2">Error Loading Products</h3>
          <p className="text-muted-foreground">{error}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={cn("w-full space-y-6", className)}>
      {/* Filters and Controls */}
      {showFilters && (
        <Card>
          <CardHeader className="pb-4">
            <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
              <div className="flex flex-col sm:flex-row gap-3 flex-1">
                {/* Search */}
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder={searchPlaceholder}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>

                {/* Category Filter */}
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="w-full sm:w-48">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories.map(category => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Status Filter */}
                <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                  <SelectTrigger className="w-full sm:w-40">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    {statuses.map(status => (
                      <SelectItem key={status} value={status}>
                        {status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* View Mode Toggle */}
              <div className="flex items-center gap-2">
                <Button
                  variant={viewMode === 'grid' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleViewModeChange('grid')}
                >
                  <Grid3X3 className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleViewModeChange('list')}
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Results Count */}
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>
                {isLoading ? 'Loading...' : `${filteredProducts.length} product${filteredProducts.length !== 1 ? 's' : ''} found`}
              </span>
              {showPagination && totalPages > 1 && (
                <span>
                  Page {currentPage} of {totalPages}
                </span>
              )}
            </div>
          </CardHeader>
        </Card>
      )}

      {/* Products Grid/List */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <ProductCardSkeleton key={i} />
          ))}
        </div>
      ) : filteredProducts.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">{emptyStateTitle}</h3>
            <p className="text-muted-foreground">{emptyStateDescription}</p>
          </CardContent>
        </Card>
      ) : (
        <div className={cn(
          viewMode === 'grid' 
            ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
            : "space-y-4"
        )}>
          {paginatedProducts.map(product => (
            <ProductCard
              key={product.id}
              product={product}
              viewMode={viewMode}
              onClick={() => handleProductClick(product.id)}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {showPagination && totalPages > 1 && !isLoading && (
        <div className="flex justify-center">
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious 
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                />
              </PaginationItem>
              
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const pageNum = i + 1;
                return (
                  <PaginationItem key={pageNum}>
                    <PaginationLink
                      onClick={() => setCurrentPage(pageNum)}
                      isActive={currentPage === pageNum}
                      className="cursor-pointer"
                    >
                      {pageNum}
                    </PaginationLink>
                  </PaginationItem>
                );
              })}
              
              {totalPages > 5 && (
                <PaginationItem>
                  <PaginationEllipsis />
                </PaginationItem>
              )}
              
              <PaginationItem>
                <PaginationNext 
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}
    </div>
  );
}

interface ProductCardProps {
  product: ProductGridItem;
  viewMode: 'grid' | 'list';
  onClick: () => void;
}

function ProductCard({ product, viewMode, onClick }: ProductCardProps) {
  const formatPrice = (price: number | string) => {
    const numPrice = typeof price === 'string' ? parseFloat(price) : price;
    return isNaN(numPrice) ? '$0.00' : `$${numPrice.toFixed(2)}`;
  };

  const getStatusVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (status.toLowerCase()) {
      case 'active':
        return 'default';
      case 'inactive':
        return 'secondary';
      case 'discontinued':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  if (viewMode === 'list') {
    return (
      <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={onClick}>
        <CardContent className="p-4">
          <div className="flex gap-4">
            <div className="w-20 h-20 flex-shrink-0">
              <ProductImage
                src={product.image_url || product.primary_image || ''}
                alt={product.name}
                className="w-full h-full object-cover rounded-lg"
              />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between mb-2">
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-lg truncate">{product.name}</h3>
                  <p className="text-sm text-muted-foreground">SKU: {product.sku}</p>
                </div>
                <div className="flex items-center gap-2 ml-4">
                  <Badge variant={getStatusVariant(product.status)}>
                    {product.status}
                  </Badge>
                  <span className="font-semibold text-lg">
                    {formatPrice(product.base_price)}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span>{product.category}</span>
                {product.mockup_stats && (
                  <span>{product.mockup_stats.total_mockups} images</span>
                )}
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {new Date(product.created_at).toLocaleDateString()}
                </span>
              </div>
              {product.metadata?.tags && product.metadata.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {product.metadata.tags.slice(0, 3).map((tag, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                  {product.metadata.tags.length > 3 && (
                    <Badge variant="outline" className="text-xs">
                      +{product.metadata.tags.length - 3} more
                    </Badge>
                  )}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="cursor-pointer hover:shadow-lg transition-all duration-300 group" onClick={onClick}>
      <div className="aspect-square overflow-hidden rounded-t-lg bg-muted">
        <ProductImage
          src={product.image_url || product.primary_image || ''}
          alt={product.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
      </div>
      <CardContent className="p-4">
        <div className="space-y-3">
          <div className="space-y-1">
            <div className="flex items-start justify-between">
              <h3 className="font-semibold truncate text-sm">{product.name}</h3>
              <Badge variant={getStatusVariant(product.status)} className="ml-2 text-xs">
                {product.status}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">SKU: {product.sku}</p>
            <p className="text-xs text-muted-foreground">{product.category}</p>
          </div>

          <div className="flex items-center justify-between">
            <span className="font-semibold text-lg">
              {formatPrice(product.base_price)}
            </span>
            {product.mockup_stats && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Eye className="h-3 w-3" />
                {product.mockup_stats.total_mockups}
              </span>
            )}
          </div>

          {product.metadata?.tags && product.metadata.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {product.metadata.tags.slice(0, 2).map((tag, index) => (
                <Badge key={index} variant="outline" className="text-xs">
                  {tag}
                </Badge>
              ))}
              {product.metadata.tags.length > 2 && (
                <Badge variant="outline" className="text-xs">
                  +{product.metadata.tags.length - 2}
                </Badge>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function ProductCardSkeleton() {
  return (
    <Card>
      <div className="aspect-square bg-muted animate-pulse rounded-t-lg" />
      <CardContent className="p-4">
        <div className="space-y-3">
          <div className="space-y-2">
            <div className="h-4 bg-muted animate-pulse rounded w-3/4" />
            <div className="h-3 bg-muted animate-pulse rounded w-1/2" />
          </div>
          <div className="flex items-center justify-between">
            <div className="h-6 bg-muted animate-pulse rounded w-16" />
            <div className="h-4 bg-muted animate-pulse rounded w-8" />
          </div>
          <div className="flex gap-1">
            <div className="h-5 bg-muted animate-pulse rounded w-12" />
            <div className="h-5 bg-muted animate-pulse rounded w-10" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}