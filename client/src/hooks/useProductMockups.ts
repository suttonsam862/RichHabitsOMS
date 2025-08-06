/**
 * PRODUCT MOCKUPS HOOK
 * Enhanced hook for managing product mockup uploads and data
 */

import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface MockupUpload {
  id: string;
  filename: string;
  progress: number;
  uploadedBytes: number;
  totalBytes: number;
  speed: number;
  status: 'uploading' | 'completed' | 'error' | 'cancelled';
}

interface MockupData {
  image_type: string;
  alt_text: string;
  notes?: string;
  metadata?: string;
}

interface UploadOptions {
  maxSizeMB?: number;
  enableCompression?: boolean;
  allowedTypes?: string[];
}

interface Mockup {
  id: string;
  catalog_item_id: string;
  image_url: string;
  thumbnail_url?: string;
  image_type: string;
  alt_text: string;
  created_at: string;
  is_active: boolean;
  metadata?: any;
  designer?: {
    id: string;
    first_name: string;
    last_name: string;
    role: string;
  };
}

export function useProductMockups(
  productId: string,
  options: UploadOptions = {}
) {
  const [uploads, setUploads] = useState<Record<string, MockupUpload>>({});
  const [currentUpload, setCurrentUpload] = useState<MockupUpload | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const {
    maxSizeMB = 10,
    enableCompression = true,
    allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
  } = options;

  // Fetch mockups for the product
  const { 
    data: mockupsData, 
    isLoading, 
    error, 
    refetch: refetchMockups 
  } = useQuery({
    queryKey: ['/api/products/library', productId, 'mockups'],
    queryFn: async () => {
      if (!productId) return { mockups: [] };
      
      const response = await apiRequest('GET', `/api/products/library/${productId}/mockups`);
      if (!response.ok) throw new Error('Failed to fetch mockups');
      
      const result = await response.json();
      return result.data || { mockups: [] };
    },
    enabled: !!productId,
    staleTime: 2 * 60 * 1000,
  });

  const mockups: Mockup[] = mockupsData?.mockups || [];

  // Validate file before upload
  const validateFile = useCallback((file: File): string | null => {
    if (!allowedTypes.includes(file.type)) {
      return `File type ${file.type} is not supported. Please use JPEG, PNG, or WebP.`;
    }

    const maxBytes = maxSizeMB * 1024 * 1024;
    if (file.size > maxBytes) {
      return `File size (${(file.size / 1024 / 1024).toFixed(1)}MB) exceeds the ${maxSizeMB}MB limit.`;
    }

    return null;
  }, [allowedTypes, maxSizeMB]);

  // Compress image if enabled
  const compressImage = useCallback(async (file: File): Promise<File> => {
    if (!enableCompression) return file;

    try {
      // Simple compression by creating a canvas and reducing quality
      return new Promise((resolve) => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();

        img.onload = () => {
          // Calculate new dimensions (max 1920px width)
          const maxWidth = 1920;
          const ratio = Math.min(maxWidth / img.width, maxWidth / img.height);
          const newWidth = img.width * ratio;
          const newHeight = img.height * ratio;

          canvas.width = newWidth;
          canvas.height = newHeight;

          ctx?.drawImage(img, 0, 0, newWidth, newHeight);

          canvas.toBlob(
            (blob) => {
              if (blob) {
                const compressedFile = new File([blob], file.name, {
                  type: file.type,
                  lastModified: Date.now()
                });
                resolve(compressedFile);
              } else {
                resolve(file);
              }
            },
            file.type,
            0.8 // 80% quality
          );
        };

        img.src = URL.createObjectURL(file);
      });
    } catch (error) {
      console.error('Compression failed:', error);
      return file;
    }
  }, [enableCompression]);

  // Upload mockup mutation
  const uploadMockupMutation = useMutation({
    mutationFn: async ({ file, data }: { file: File; data: MockupData }) => {
      // Validate file
      const validationError = validateFile(file);
      if (validationError) {
        throw new Error(validationError);
      }

      // Compress if enabled
      const processedFile = await compressImage(file);

      // Create upload tracking
      const uploadId = `upload_${Date.now()}_${Math.random()}`;
      const upload: MockupUpload = {
        id: uploadId,
        filename: file.name,
        progress: 0,
        uploadedBytes: 0,
        totalBytes: processedFile.size,
        speed: 0,
        status: 'uploading'
      };

      setUploads(prev => ({ ...prev, [uploadId]: upload }));
      setCurrentUpload(upload);

      // Prepare form data
      const formData = new FormData();
      formData.append('file', processedFile);
      formData.append('image_type', data.image_type);
      formData.append('alt_text', data.alt_text);
      if (data.notes) formData.append('notes', data.notes);
      if (data.metadata) formData.append('metadata', data.metadata);

      try {
        const response = await fetch(`/api/products/library/${productId}/mockups`, {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          throw new Error(`Upload failed: ${response.statusText}`);
        }

        const result = await response.json();

        // Update upload status
        setUploads(prev => ({
          ...prev,
          [uploadId]: { ...prev[uploadId], status: 'completed', progress: 100 }
        }));

        setCurrentUpload(null);

        return result;
      } catch (error) {
        setUploads(prev => ({
          ...prev,
          [uploadId]: { ...prev[uploadId], status: 'error' }
        }));
        setCurrentUpload(null);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['/api/products/library', productId, 'mockups']
      });
      toast({
        title: 'Upload Successful',
        description: 'Mockup has been uploaded successfully.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Upload Failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Delete mockup mutation
  const deleteMockupMutation = useMutation({
    mutationFn: async (mockupId: string) => {
      const response = await apiRequest('DELETE', `/api/products/library/mockups/${mockupId}`);
      if (!response.ok) {
        throw new Error('Failed to delete mockup');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['/api/products/library', productId, 'mockups']
      });
      toast({
        title: 'Mockup Deleted',
        description: 'The mockup has been removed successfully.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Delete Failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Cancel upload
  const cancelUpload = useCallback((uploadId: string) => {
    setUploads(prev => ({
      ...prev,
      [uploadId]: { ...prev[uploadId], status: 'cancelled' }
    }));
    
    if (currentUpload?.id === uploadId) {
      setCurrentUpload(null);
    }
  }, [currentUpload]);

  // Clean up completed uploads after a delay
  useEffect(() => {
    const timer = setTimeout(() => {
      setUploads(prev => {
        const filtered = { ...prev };
        Object.keys(filtered).forEach(key => {
          if (filtered[key].status === 'completed' || filtered[key].status === 'cancelled') {
            delete filtered[key];
          }
        });
        return filtered;
      });
    }, 5000);

    return () => clearTimeout(timer);
  }, [uploads]);

  return {
    // Data
    mockups,
    isLoading,
    error,

    // Upload functionality
    uploadMockup: uploadMockupMutation.mutateAsync,
    isUploading: uploadMockupMutation.isPending,
    uploads,
    currentUpload,
    cancelUpload,

    // Delete functionality
    deleteMockup: deleteMockupMutation.mutate,
    isDeleting: deleteMockupMutation.isPending,

    // Utilities
    refetchMockups,
    validateFile,
    compressImage,

    // Statistics
    totalMockups: mockups.length,
    mockupsByType: mockups.reduce((acc, mockup) => {
      acc[mockup.image_type] = (acc[mockup.image_type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>),
  };
}