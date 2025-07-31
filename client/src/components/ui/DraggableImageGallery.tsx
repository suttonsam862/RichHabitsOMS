/**
 * DRAGGABLE IMAGE GALLERY COMPONENT
 * Drag-and-drop reorderable image gallery with JSONB field updates
 */

import React, { useState } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ProductImage } from '@/components/ui/FallbackImage';
import { Trash2, Star, StarOff, GripVertical, Save, RotateCcw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useMutation, useQueryClient } from '@tanstack/react-query';

export interface GalleryImage {
  id: string;
  url: string;
  alt?: string;
  caption?: string;
  isPrimary?: boolean;
  order?: number;
  metadata?: {
    filename?: string;
    size?: number;
    uploadedAt?: string;
  };
}

interface DraggableImageGalleryProps {
  images: GalleryImage[];
  entityType: 'catalog_item' | 'order' | 'design_task';
  entityId: string;
  onReorder?: (reorderedImages: GalleryImage[]) => void;
  onDelete?: (imageId: string) => void;
  onSetPrimary?: (imageId: string) => void;
  readOnly?: boolean;
  maxImages?: number;
  className?: string;
}

// Individual sortable image item
interface SortableImageItemProps {
  image: GalleryImage;
  index: number;
  onDelete: (id: string) => void;
  onSetPrimary: (id: string) => void;
  readOnly: boolean;
  entityType: string;
}

function SortableImageItem({ image, index, onDelete, onSetPrimary, readOnly, entityType }: SortableImageItemProps) {
  const [isLoading, setIsLoading] = useState(false);
  
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: image.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const handleDelete = async () => {
    if (readOnly || isLoading) return;
    setIsLoading(true);
    try {
      await onDelete(image.id);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetPrimary = async () => {
    if (readOnly || isLoading) return;
    setIsLoading(true);
    try {
      await onSetPrimary(image.id);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card 
      ref={setNodeRef}
      style={style}
      className={`group relative overflow-hidden hover:shadow-md transition-shadow ${
        isDragging ? 'opacity-50' : ''
      }`}
    >
      <CardContent className="p-0">
        {/* Drag Handle */}
        {!readOnly && (
          <div 
            className="absolute top-2 left-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity"
            {...attributes}
            {...listeners}
          >
            <div className="bg-black/50 rounded p-1 cursor-grab">
              <GripVertical className="w-4 h-4 text-white" />
            </div>
          </div>
        )}

        {/* Primary Badge */}
        {image.isPrimary && (
          <Badge 
            variant="default" 
            className="absolute top-2 right-2 z-10 bg-yellow-500 text-black"
          >
            <Star className="w-3 h-3 mr-1" />
            Primary
          </Badge>
        )}

        {/* Image */}
        <div className="aspect-square">
          <ProductImage
            src={image.url}
            name={image.alt || `${entityType} image ${index + 1}`}
            size="lg"
            className="w-full h-full object-cover"
          />
        </div>

        {/* Overlay Controls */}
        {!readOnly && (
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors">
            <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
              {!image.isPrimary && (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={handleSetPrimary}
                  disabled={isLoading}
                  className="h-7 px-2"
                >
                  <Star className="w-3 h-3" />
                </Button>
              )}
              {image.isPrimary && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleSetPrimary}
                  disabled={isLoading}
                  className="h-7 px-2"
                >
                  <StarOff className="w-3 h-3" />
                </Button>
              )}
              <Button
                size="sm"
                variant="destructive"
                onClick={handleDelete}
                disabled={isLoading}
                className="h-7 px-2"
              >
                <Trash2 className="w-3 h-3" />
              </Button>
            </div>
          </div>
        )}

        {/* Image Info */}
        <div className="p-2 bg-gray-50 dark:bg-gray-800">
          <div className="text-xs text-gray-600 dark:text-gray-400 truncate">
            {image.caption || image.alt || `Image ${index + 1}`}
          </div>
          {image.metadata?.filename && (
            <div className="text-xs text-gray-500 truncate">
              {image.metadata.filename}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function DraggableImageGallery({
  images: initialImages,
  entityType,
  entityId,
  onReorder,
  onDelete,
  onSetPrimary,
  readOnly = false,
  maxImages = 20,
  className = ''
}: DraggableImageGalleryProps) {
  const [images, setImages] = useState<GalleryImage[]>(
    initialImages.map((img, index) => ({ ...img, order: img.order ?? index }))
  );
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Save reordered images to backend
  const saveOrderMutation = useMutation({
    mutationFn: async (reorderedImages: GalleryImage[]) => {
      const authToken = localStorage.getItem('authToken');
      if (!authToken) throw new Error('Not authenticated');

      const endpoint = getUpdateEndpoint(entityType, entityId);
      
      const response = await fetch(endpoint, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          images: reorderedImages.map((img, index) => ({
            ...img,
            order: index
          }))
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to update image order');
      }

      return response.json();
    },
    onSuccess: () => {
      setHasChanges(false);
      toast({
        title: "Order Updated",
        description: "Image gallery order has been saved successfully.",
      });
      
      // Invalidate relevant queries with specific entity ID pattern
      if (entityType === 'catalog_item') {
        queryClient.invalidateQueries(['catalog', entityId]);
      } else {
        queryClient.invalidateQueries({ 
          queryKey: [getQueryKey(entityType), entityId] 
        });
      }
      
      if (onReorder) {
        onReorder(images);
      }
    },
    onError: (error: any) => {
      toast({
        title: "Save Failed",
        description: error.message || "Failed to save image order changes.",
        variant: "destructive",
      });
    }
  });

  // Handle drag end - reorder images
  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    if (readOnly || !over || active.id === over.id) return;

    const oldIndex = images.findIndex((img) => img.id === active.id);
    const newIndex = images.findIndex((img) => img.id === over.id);

    if (oldIndex !== -1 && newIndex !== -1) {
      const reorderedImages = arrayMove(images, oldIndex, newIndex);
      setImages(reorderedImages);
      setHasChanges(true);
    }
  }

  // Save changes
  const handleSave = async () => {
    if (!hasChanges || isSaving) return;
    
    setIsSaving(true);
    try {
      await saveOrderMutation.mutateAsync(images);
    } finally {
      setIsSaving(false);
    }
  };

  // Reset to original order
  const handleReset = () => {
    if (isSaving) return;
    
    setImages(initialImages.map((img, index) => ({ ...img, order: img.order ?? index })));
    setHasChanges(false);
    
    toast({
      title: "Order Reset",
      description: "Image gallery order has been reset to original.",
    });
  };

  // Delete image mutation - removes from both storage and metadata
  const deleteImageMutation = useMutation({
    mutationFn: async (imageId: string) => {
      const authToken = localStorage.getItem('authToken');
      if (!authToken) throw new Error('Not authenticated');

      const endpoint = getDeleteEndpoint(entityType, entityId, imageId);
      
      const response = await fetch(endpoint, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to delete image');
      }

      return response.json();
    },
    onSuccess: (data, imageId) => {
      // Remove image from local state
      setImages(prev => prev.filter(img => img.id !== imageId));
      
      toast({
        title: "Image Deleted",
        description: "Image has been permanently deleted from storage and metadata.",
      });
      
      // Invalidate relevant queries
      queryClient.invalidateQueries({ 
        queryKey: [getQueryKey(entityType), entityId] 
      });
      
      if (onDelete) {
        onDelete(imageId);
      }
    },
    onError: (error: any) => {
      toast({
        title: "Deletion Failed",
        description: error.message || "Failed to delete image. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Handle image deletion with confirmation
  const handleDelete = async (imageId: string) => {
    if (confirm('Are you sure you want to permanently delete this image? This action cannot be undone.')) {
      deleteImageMutation.mutate(imageId);
    }
  };

  // Handle set primary
  const handleSetPrimary = async (imageId: string) => {
    if (onSetPrimary) {
      await onSetPrimary(imageId);
      // Update local state
      setImages(prev => prev.map(img => ({
        ...img,
        isPrimary: img.id === imageId
      })));
    }
  };

  if (images.length === 0) {
    return (
      <div className={`text-center py-8 text-gray-500 ${className}`}>
        <div className="text-sm">No images in gallery</div>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header with controls */}
      {!readOnly && hasChanges && (
        <div className="flex items-center justify-between p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
          <div className="flex items-center gap-2 text-sm text-yellow-800 dark:text-yellow-200">
            <RotateCcw className="w-4 h-4" />
            <span>Gallery order has been modified</span>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handleReset}
              disabled={isSaving}
            >
              <RotateCcw className="w-4 h-4 mr-1" />
              Reset
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={isSaving}
            >
              <Save className="w-4 h-4 mr-1" />
              {isSaving ? 'Saving...' : 'Save Order'}
            </Button>
          </div>
        </div>
      )}

      {/* Gallery info */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-600 dark:text-gray-400">
          {images.length} image{images.length !== 1 ? 's' : ''} 
          {maxImages && ` (max ${maxImages})`}
        </div>
        {!readOnly && (
          <div className="text-xs text-gray-500">
            Drag images to reorder
          </div>
        )}
      </div>

      {/* Sortable gallery */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext 
          items={images.map(img => img.id)} 
          strategy={rectSortingStrategy}
        >
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {images.map((image, index) => (
              <SortableImageItem
                key={image.id}
                index={index}
                image={image}
                onDelete={handleDelete}
                onSetPrimary={handleSetPrimary}
                readOnly={readOnly}
                entityType={entityType}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}

// Helper functions
function getUpdateEndpoint(entityType: string, entityId: string): string {
  switch (entityType) {
    case 'catalog_item':
      return `/api/catalog/${entityId}/reorder-images`;
    case 'order':
      return `/api/orders/${entityId}/reorder-images`;
    case 'design_task':
      return `/api/design-tasks/${entityId}/reorder-images`;
    default:
      throw new Error(`Unsupported entity type: ${entityType}`);
  }
}

function getQueryKey(entityType: string): string {
  switch (entityType) {
    case 'catalog_item':
      return '/api/catalog';
    case 'order':
      return '/api/orders';
    case 'design_task':
      return '/api/design-tasks';
    default:
      return '/api/entities';
  }
}

function getDeleteEndpoint(entityType: string, entityId: string, imageId: string): string {
  switch (entityType) {
    case 'catalog_item':
      return `/api/catalog/${entityId}/images/${imageId}`;
    case 'order':
      return `/api/orders/${entityId}/images/${imageId}`;
    case 'design_task':
      return `/api/design-tasks/${entityId}/images/${imageId}`;
    default:
      throw new Error(`Unsupported entity type: ${entityType}`);
  }
}

export default DraggableImageGallery;