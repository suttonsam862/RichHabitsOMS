import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { 
  ImageIcon, 
  Trash2, 
  Eye, 
  Calendar, 
  User, 
  Loader2,
  AlertTriangle,
  Download,
  ZoomIn
} from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { cn } from '@/lib/utils';

interface MockupImage {
  id: string;
  catalog_item_id: string;
  image_url: string;
  image_path?: string;
  image_type: string;
  alt_text?: string;
  designer_id?: string;
  upload_timestamp: string;
  created_at: string;
  is_active: boolean;
  metadata?: any;
  user_profiles?: {
    id: string;
    username: string;
    first_name?: string;
    last_name?: string;
    role: string;
  };
}

interface MockupGalleryProps {
  productId: string;
  productName: string;
  className?: string;
}

export function MockupGallery({ 
  productId, 
  productName, 
  className = '' 
}: MockupGalleryProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [selectedImage, setSelectedImage] = useState<MockupImage | null>(null);
  const [imageToDelete, setImageToDelete] = useState<MockupImage | null>(null);
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());

  // Check if user can edit (admin, salesperson, or designer)
  const canEdit = user?.role === 'admin' || user?.role === 'salesperson' || user?.role === 'designer';

  // Fetch mockups for the product
  const { 
    data: mockupsData, 
    isLoading, 
    error, 
    refetch 
  } = useQuery({
    queryKey: ['/api/products/library', productId, 'mockups'],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/products/library/${productId}/mockups?include_designer_info=true`);
      if (!response.ok) {
        throw new Error('Failed to fetch mockups');
      }
      const result = await response.json();
      return result.data || [];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const mockups: MockupImage[] = Array.isArray(mockupsData) ? mockupsData : [];

  // Delete mockup mutation
  const { mutate: deleteMockup, isPending: isDeleting } = useMutation({
    mutationFn: async (mockupId: string) => {
      const response = await apiRequest('DELETE', `/api/products/library/${productId}/mockups/${mockupId}`);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to delete mockup');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Mockup deleted successfully',
      });
      queryClient.invalidateQueries({ 
        queryKey: ['/api/products/library', productId, 'mockups'] 
      });
      setImageToDelete(null);
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleImageError = (imageId: string) => {
    setImageErrors(prev => new Set([...prev, imageId]));
  };

  const formatTimestamp = (timestamp: string) => {
    try {
      return new Date(timestamp).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'Unknown date';
    }
  };

  const getDesignerName = (mockup: MockupImage) => {
    const profile = mockup.user_profiles;
    if (profile) {
      if (profile.first_name || profile.last_name) {
        return `${profile.first_name || ''} ${profile.last_name || ''}`.trim();
      }
      return profile.username || 'Unknown Designer';
    }
    return mockup.designer_id || 'Unknown Designer';
  };

  const getImageTypeLabel = (type: string) => {
    const typeMap: Record<string, string> = {
      'mockup': 'Mockup',
      'product_photo': 'Product Photo',
      'design_proof': 'Design Proof',
      'size_chart': 'Size Chart',
      'color_reference': 'Color Reference',
      'technical_drawing': 'Technical Drawing',
      'primary': 'Primary Image',
    };
    return typeMap[type] || type.charAt(0).toUpperCase() + type.slice(1);
  };

  const getTypeVariant = (type: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (type) {
      case 'primary':
      case 'product_photo':
        return 'default';
      case 'mockup':
      case 'design_proof':
        return 'secondary';
      case 'size_chart':
      case 'technical_drawing':
        return 'outline';
      default:
        return 'outline';
    }
  };

  if (isLoading) {
    return (
      <Card className={cn("w-full", className)}>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <ImageIcon className="h-5 w-5" />
            <span>Product Mockups</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="ml-2">Loading mockups...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={cn("w-full", className)}>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <ImageIcon className="h-5 w-5" />
            <span>Product Mockups</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <AlertTriangle className="h-8 w-8 text-destructive mb-2" />
            <p className="text-sm text-muted-foreground mb-4">Failed to load mockups</p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className={cn("w-full", className)}>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <ImageIcon className="h-5 w-5" />
              <span>Product Mockups</span>
              <Badge variant="outline">{mockups.length}</Badge>
            </div>
            {canEdit && (
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                Refresh
              </Button>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {mockups.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <ImageIcon className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No mockups available</h3>
              <p className="text-sm text-muted-foreground mb-4">
                No mockup images have been uploaded for {productName} yet.
              </p>
              {canEdit && (
                <p className="text-xs text-muted-foreground">
                  Mockups can be uploaded by designers and administrators.
                </p>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {mockups.map((mockup) => (
                <MockupCard
                  key={mockup.id}
                  mockup={mockup}
                  onView={() => setSelectedImage(mockup)}
                  onDelete={canEdit ? () => setImageToDelete(mockup) : undefined}
                  onImageError={() => handleImageError(mockup.id)}
                  hasError={imageErrors.has(mockup.id)}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Image Viewer Modal */}
      <Dialog open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <ZoomIn className="h-5 w-5" />
              <span>{selectedImage?.alt_text || 'Product Mockup'}</span>
              <Badge variant={getTypeVariant(selectedImage?.image_type || '')}>
                {getImageTypeLabel(selectedImage?.image_type || '')}
              </Badge>
            </DialogTitle>
          </DialogHeader>
          {selectedImage && (
            <div className="space-y-4">
              <div className="relative bg-gray-50 rounded-lg overflow-hidden">
                <img
                  src={selectedImage.image_url}
                  alt={selectedImage.alt_text || 'Product mockup'}
                  className="w-full h-auto max-h-[60vh] object-contain"
                  loading="lazy"
                />
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Designer:</span>
                  <p className="text-muted-foreground">{getDesignerName(selectedImage)}</p>
                </div>
                <div>
                  <span className="font-medium">Uploaded:</span>
                  <p className="text-muted-foreground">
                    {formatTimestamp(selectedImage.upload_timestamp || selectedImage.created_at)}
                  </p>
                </div>
              </div>
              <div className="flex justify-between items-center pt-4 border-t">
                <div className="flex space-x-2">
                  <Button variant="outline" size="sm" asChild>
                    <a 
                      href={selectedImage.image_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      download
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </a>
                  </Button>
                </div>
                {canEdit && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => {
                      setImageToDelete(selectedImage);
                      setSelectedImage(null);
                    }}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!imageToDelete} onOpenChange={() => setImageToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Mockup</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this mockup? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => imageToDelete && deleteMockup(imageToDelete.id)}
              disabled={isDeleting}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

interface MockupCardProps {
  mockup: MockupImage;
  onView: () => void;
  onDelete?: () => void;
  onImageError: () => void;
  hasError: boolean;
}

function MockupCard({ mockup, onView, onDelete, onImageError, hasError }: MockupCardProps) {
  const getDesignerName = (mockup: MockupImage) => {
    const profile = mockup.user_profiles;
    if (profile) {
      if (profile.first_name || profile.last_name) {
        return `${profile.first_name || ''} ${profile.last_name || ''}`.trim();
      }
      return profile.username || 'Unknown';
    }
    return mockup.designer_id || 'Unknown';
  };

  const formatTimestamp = (timestamp: string) => {
    try {
      return new Date(timestamp).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    } catch {
      return 'Unknown';
    }
  };

  const getImageTypeLabel = (type: string) => {
    const typeMap: Record<string, string> = {
      'mockup': 'Mockup',
      'product_photo': 'Product Photo',
      'design_proof': 'Design Proof',
      'size_chart': 'Size Chart',
      'color_reference': 'Color Reference',
      'technical_drawing': 'Technical Drawing',
      'primary': 'Primary Image',
    };
    return typeMap[type] || type.charAt(0).toUpperCase() + type.slice(1);
  };

  const getTypeVariant = (type: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (type) {
      case 'primary':
      case 'product_photo':
        return 'default';
      case 'mockup':
      case 'design_proof':
        return 'secondary';
      case 'size_chart':
      case 'technical_drawing':
        return 'outline';
      default:
        return 'outline';
    }
  };

  return (
    <Card className="group hover:shadow-md transition-shadow cursor-pointer">
      <div className="aspect-square bg-gray-50 rounded-t-lg overflow-hidden relative">
        {hasError ? (
          <div className="w-full h-full flex items-center justify-center">
            <ImageIcon className="h-8 w-8 text-muted-foreground" />
          </div>
        ) : (
          <img
            src={mockup.image_url}
            alt={mockup.alt_text || 'Product mockup'}
            className="w-full h-full object-cover transition-transform group-hover:scale-105"
            loading="lazy"
            onError={onImageError}
            onClick={onView}
          />
        )}
        
        {/* Overlay with actions */}
        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center space-x-2">
          <Button size="sm" variant="secondary" onClick={onView}>
            <Eye className="h-4 w-4 mr-1" />
            View
          </Button>
          {onDelete && (
            <Button size="sm" variant="destructive" onClick={onDelete}>
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
      
      <CardContent className="p-3">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Badge variant={getTypeVariant(mockup.image_type)} className="text-xs">
              {getImageTypeLabel(mockup.image_type)}
            </Badge>
            {!mockup.is_active && (
              <Badge variant="outline" className="text-xs">
                Inactive
              </Badge>
            )}
          </div>
          
          <div className="space-y-1 text-xs text-muted-foreground">
            <div className="flex items-center">
              <User className="h-3 w-3 mr-1" />
              <span className="truncate">{getDesignerName(mockup)}</span>
            </div>
            <div className="flex items-center">
              <Calendar className="h-3 w-3 mr-1" />
              <span>{formatTimestamp(mockup.upload_timestamp || mockup.created_at)}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}