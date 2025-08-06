/**
 * MOCKUP GALLERY COMPONENT
 * Image grid for browsing product mockups with advanced filtering
 */

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Images, 
  Filter, 
  Search, 
  Eye, 
  Download,
  User,
  Calendar,
  Tag,
  Grid,
  List
} from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { ProductImage } from '@/components/ui/FallbackImage';
import { formatDate } from '@/utils/dateFormatting';

interface Mockup {
  id: string;
  catalog_item_id: string;
  product_name: string;
  image_url: string;
  thumbnail_url: string;
  image_type: string;
  alt_text: string;
  created_at: string;
  is_active: boolean;
  metadata: {
    designer_notes?: string;
    file_size?: number;
    dimensions?: string;
  };
  designer?: {
    id: string;
    first_name: string;
    last_name: string;
    role: string;
  };
  product_info?: {
    name: string;
    sku: string;
    category: string;
  };
}

interface MockupGalleryProps {
  productId?: string;
  onMockupSelect?: (mockup: Mockup) => void;
  className?: string;
}

export function MockupGallery({ 
  productId, 
  onMockupSelect, 
  className = '' 
}: MockupGalleryProps) {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedMockup, setSelectedMockup] = useState<Mockup | null>(null);
  const [filters, setFilters] = useState({
    search: '',
    image_type: '',
    designer_id: '',
    date_range: '',
    sort_by: 'created_at',
    sort_order: 'desc',
    limit: '24'
  });

  // Build query URL
  const buildQueryUrl = () => {
    const baseUrl = productId ? 
      `/api/products/library/${productId}/mockups` : 
      '/api/products/library/mockups/all';
    
    const queryParams = new URLSearchParams({
      ...filters,
      include_designer_info: 'true',
      include_product_info: 'true'
    }).toString();
    
    return `${baseUrl}?${queryParams}`;
  };

  // Fetch mockups
  const { data: mockupsData, isLoading, error } = useQuery({
    queryKey: ['/api/products/library/mockups', productId, filters],
    queryFn: async () => {
      const response = await apiRequest('GET', buildQueryUrl());
      if (!response.ok) throw new Error('Failed to fetch mockups');
      const result = await response.json();
      return result.data;
    },
    staleTime: 2 * 60 * 1000,
  });

  // Fetch designers for filter
  const { data: designersData } = useQuery({
    queryKey: ['/api/users', { role: 'designer' }],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/users?role=designer');
      if (!response.ok) throw new Error('Failed to fetch designers');
      const result = await response.json();
      return result.data;
    },
  });

  const mockups = mockupsData?.mockups || [];
  const designers = designersData?.users || [];

  const updateFilter = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleMockupClick = (mockup: Mockup) => {
    setSelectedMockup(mockup);
    onMockupSelect?.(mockup);
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'Unknown size';
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const getImageTypeColor = (type: string) => {
    switch (type) {
      case 'mockup': return 'bg-blue-100 text-blue-800';
      case 'product_photo': return 'bg-green-100 text-green-800';
      case 'design_proof': return 'bg-purple-100 text-purple-800';
      case 'size_chart': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Images className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">Failed to load mockups</p>
          <Button variant="outline" onClick={() => window.location.reload()}>
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center">
            <Images className="mr-2 h-6 w-6" />
            Mockup Gallery
          </h2>
          <p className="text-gray-600">
            {isLoading ? 'Loading...' : `${mockups.length} mockups available`}
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
                  placeholder="Search mockups..."
                  value={filters.search}
                  onChange={(e) => updateFilter('search', e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">Type</label>
              <Select value={filters.image_type} onValueChange={(value) => updateFilter('image_type', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Types</SelectItem>
                  <SelectItem value="mockup">Mockup</SelectItem>
                  <SelectItem value="product_photo">Product Photo</SelectItem>
                  <SelectItem value="design_proof">Design Proof</SelectItem>
                  <SelectItem value="size_chart">Size Chart</SelectItem>
                  <SelectItem value="color_reference">Color Reference</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">Designer</label>
              <Select value={filters.designer_id} onValueChange={(value) => updateFilter('designer_id', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="All Designers" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Designers</SelectItem>
                  {designers.map((designer: any) => (
                    <SelectItem key={designer.id} value={designer.id}>
                      {designer.first_name} {designer.last_name}
                    </SelectItem>
                  ))}
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
                  <SelectItem value="created_at">Upload Date</SelectItem>
                  <SelectItem value="image_type">Type</SelectItem>
                  <SelectItem value="product_name">Product Name</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Mockups Display */}
      {isLoading ? (
        <div className={viewMode === 'grid' ? 
          'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4' : 
          'space-y-4'
        }>
          {Array(12).fill(0).map((_, i) => (
            viewMode === 'grid' ? (
              <Card key={i}>
                <Skeleton className="aspect-square w-full" />
                <CardContent className="p-3">
                  <Skeleton className="h-3 w-full mb-1" />
                  <Skeleton className="h-3 w-2/3" />
                </CardContent>
              </Card>
            ) : (
              <Card key={i} className="p-4">
                <div className="flex items-center space-x-4">
                  <Skeleton className="w-16 h-16 rounded" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-3 w-1/3" />
                  </div>
                </div>
              </Card>
            )
          ))}
        </div>
      ) : mockups.length === 0 ? (
        // Empty State
        <Card className="p-12">
          <div className="text-center">
            <Images className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No mockups found</h3>
            <p className="text-gray-500 mb-4">
              {filters.search || filters.image_type || filters.designer_id ? 
                'Try adjusting your filters to see more results.' : 
                'No mockups have been uploaded yet. Start by uploading your first mockup.'
              }
            </p>
            {(filters.search || filters.image_type || filters.designer_id) && (
              <Button 
                variant="outline" 
                onClick={() => setFilters({
                  search: '', image_type: '', designer_id: '', date_range: '',
                  sort_by: 'created_at', sort_order: 'desc', limit: '24'
                })}
              >
                Clear Filters
              </Button>
            )}
          </div>
        </Card>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
          {mockups.map((mockup) => (
            <Card 
              key={mockup.id} 
              className="cursor-pointer hover:shadow-lg transition-shadow group"
              onClick={() => handleMockupClick(mockup)}
            >
              <div className="aspect-square relative overflow-hidden rounded-t-lg">
                <ProductImage
                  src={mockup.thumbnail_url || mockup.image_url}
                  alt={mockup.alt_text}
                  className="object-cover w-full h-full group-hover:scale-105 transition-transform"
                />

                {/* Overlay */}
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-opacity flex items-center justify-center">
                  <Eye className="text-white opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8" />
                </div>

                {/* Type badge */}
                <div className="absolute top-2 left-2">
                  <Badge 
                    className={`text-xs ${getImageTypeColor(mockup.image_type)}`}
                    variant="secondary"
                  >
                    {mockup.image_type.replace('_', ' ')}
                  </Badge>
                </div>
              </div>

              <CardContent className="p-3">
                <div className="space-y-1">
                  <h4 className="font-medium text-sm truncate">
                    {mockup.product_info?.name || mockup.product_name}
                  </h4>
                  <p className="text-xs text-gray-500 truncate">
                    {mockup.product_info?.sku}
                  </p>
                  {mockup.designer && (
                    <div className="flex items-center text-xs text-gray-500">
                      <User className="h-3 w-3 mr-1" />
                      {mockup.designer.first_name} {mockup.designer.last_name}
                    </div>
                  )}
                  <div className="flex items-center text-xs text-gray-500">
                    <Calendar className="h-3 w-3 mr-1" />
                    {formatDate(mockup.created_at)}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {mockups.map((mockup) => (
            <Card 
              key={mockup.id}
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => handleMockupClick(mockup)}
            >
              <CardContent className="p-4">
                <div className="flex items-center space-x-4">
                  <div className="w-16 h-16 flex-shrink-0">
                    <ProductImage
                      src={mockup.thumbnail_url || mockup.image_url}
                      alt={mockup.alt_text}
                      className="w-full h-full object-cover rounded-lg"
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium truncate">
                          {mockup.product_info?.name || mockup.product_name}
                        </h4>
                        <p className="text-sm text-gray-600 truncate">
                          {mockup.alt_text}
                        </p>
                      </div>

                      <div className="text-right">
                        <Badge 
                          className={`${getImageTypeColor(mockup.image_type)} mb-1`}
                          variant="secondary"
                        >
                          {mockup.image_type.replace('_', ' ')}
                        </Badge>
                        <p className="text-xs text-gray-500">
                          {mockup.product_info?.sku}
                        </p>
                      </div>
                    </div>

                    <div className="mt-2 flex items-center space-x-4 text-sm text-gray-500">
                      {mockup.designer && (
                        <span className="flex items-center">
                          <User className="h-4 w-4 mr-1" />
                          {mockup.designer.first_name} {mockup.designer.last_name}
                        </span>
                      )}
                      <span className="flex items-center">
                        <Calendar className="h-4 w-4 mr-1" />
                        {formatDate(mockup.created_at)}
                      </span>
                      {mockup.metadata.file_size && (
                        <span>{formatFileSize(mockup.metadata.file_size)}</span>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Mockup Detail Modal */}
      {selectedMockup && (
        <Dialog open={!!selectedMockup} onOpenChange={() => setSelectedMockup(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center space-x-2">
                <span>{selectedMockup.product_info?.name || selectedMockup.product_name}</span>
                <Badge 
                  className={getImageTypeColor(selectedMockup.image_type)}
                  variant="secondary"
                >
                  {selectedMockup.image_type.replace('_', ' ')}
                </Badge>
              </DialogTitle>
            </DialogHeader>

            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <ProductImage
                  src={selectedMockup.image_url}
                  alt={selectedMockup.alt_text}
                  className="w-full rounded-lg"
                />
              </div>

              <div className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">Details</h4>
                  <div className="space-y-2 text-sm">
                    <div><strong>Product:</strong> {selectedMockup.product_info?.name}</div>
                    <div><strong>SKU:</strong> {selectedMockup.product_info?.sku}</div>
                    <div><strong>Category:</strong> {selectedMockup.product_info?.category}</div>
                    <div><strong>Alt Text:</strong> {selectedMockup.alt_text}</div>
                    <div><strong>Upload Date:</strong> {formatDate(selectedMockup.created_at)}</div>
                  </div>
                </div>

                {selectedMockup.designer && (
                  <div>
                    <h4 className="font-medium mb-2">Designer</h4>
                    <div className="text-sm">
                      {selectedMockup.designer.first_name} {selectedMockup.designer.last_name}
                      <Badge className="ml-2" variant="outline">
                        {selectedMockup.designer.role}
                      </Badge>
                    </div>
                  </div>
                )}

                {selectedMockup.metadata.designer_notes && (
                  <div>
                    <h4 className="font-medium mb-2">Designer Notes</h4>
                    <p className="text-sm text-gray-600">
                      {selectedMockup.metadata.designer_notes}
                    </p>
                  </div>
                )}

                {(selectedMockup.metadata.file_size || selectedMockup.metadata.dimensions) && (
                  <div>
                    <h4 className="font-medium mb-2">File Information</h4>
                    <div className="space-y-1 text-sm">
                      {selectedMockup.metadata.file_size && (
                        <div><strong>Size:</strong> {formatFileSize(selectedMockup.metadata.file_size)}</div>
                      )}
                      {selectedMockup.metadata.dimensions && (
                        <div><strong>Dimensions:</strong> {selectedMockup.metadata.dimensions}</div>
                      )}
                    </div>
                  </div>
                )}

                <div className="pt-4">
                  <Button 
                    onClick={() => window.open(selectedMockup.image_url, '_blank')}
                    className="w-full"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    View Full Size
                  </Button>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}