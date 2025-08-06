
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useUploadProgress } from '@/hooks/useUploadProgress';
import { validateFile } from '@/utils/fileValidation';
import { compressImage, shouldCompress } from '@/utils/imageCompression';
import { v4 as uuidv4 } from 'uuid';

// Updated interface to match new API schema
interface Mockup {
  id: string;
  catalog_item_id: string;
  image_url: string;
  image_path: string;
  image_type: string;
  alt_text: string;
  is_active: boolean;
  upload_timestamp: string;
  created_at: string;
  metadata: {
    file_sizes?: any;
    upload_details?: any;
    designer_notes?: string;
  };
  designer?: {
    id: string;
    username: string;
    first_name: string;
    last_name: string;
    role: string;
  };
}

interface UploadMockupData {
  image_type?: string;
  alt_text?: string;
  metadata?: string;
  notes?: string;
}

interface UploadOptions {
  maxSizeMB?: number;
  enableCompression?: boolean;
  accept?: string;
}

export function useProductMockups(
  productId: number | string, 
  options: UploadOptions = {}
) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const {
    uploads,
    startUpload,
    updateProgress,
    completeUpload,
    errorUpload,
    cancelUpload,
    getUpload
  } = useUploadProgress();

  // Fetch mockups for a product with enhanced options
  const { data: mockupsData, isLoading, error, refetch } = useQuery({
    queryKey: ['/api/products/library', productId, 'mockups'],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/products/library/${productId}/mockups?include_designer_info=true`);
      if (!response.ok) {
        throw new Error(`Failed to fetch mockups: ${response.status}`);
      }
      const result = await response.json();
      return result.data || result; // Handle both old and new response formats
    },
    enabled: !!productId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 15 * 60 * 1000, // 15 minutes (formerly cacheTime)
  });

  // Enhanced upload mockup mutation with validation and compression
  const uploadMockupMutation = useMutation({
    mutationFn: async ({ file, data }: { file: File; data: UploadMockupData }) => {
      // Generate unique upload ID
      const uploadId = uuidv4();
      
      // Start progress tracking
      startUpload(uploadId, file.name, file.size);

      try {
        // Validate file
        const validation = validateFile(file, { 
          maxSizeMB: options.maxSizeMB || 10
        });
        
        if (!validation.isValid) {
          throw new Error(validation.error || 'Invalid file');
        }

        // Compress if needed and enabled
        let fileToUse = file;
        if (options.enableCompression !== false && shouldCompress(file)) {
          try {
            const compressed = await compressImage(file);
            fileToUse = compressed.file;
            console.log(`Compressed mockup: ${file.size} → ${compressed.file.size} bytes`);
          } catch (compressionError) {
            console.warn('Compression failed, using original:', compressionError);
          }
        }

        const formData = new FormData();
        formData.append('mockup', fileToUse);
        
        // Add metadata with proper structure
        const metadata = {
          original_filename: file.name,
          original_size: file.size,
          ...(typeof data.metadata === 'string' ? JSON.parse(data.metadata) : data.metadata || {})
        };
        
        formData.append('image_type', data.image_type || 'mockup');
        formData.append('alt_text', data.alt_text || `Mockup for product ${productId}`);
        formData.append('metadata', JSON.stringify(metadata));
        formData.append('notes', data.notes || '');

        // Get auth token
        const authToken = localStorage.getItem('authToken') || 
                         localStorage.getItem('token') || 
                         'dev-admin-token-12345';

        // Use XMLHttpRequest for progress tracking
        const xhr = new XMLHttpRequest();
        
        return new Promise((resolve, reject) => {
          xhr.upload.addEventListener('progress', (event) => {
            if (event.lengthComputable) {
              updateProgress(uploadId, event.loaded);
            }
          });

          xhr.addEventListener('load', () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              try {
                const result = JSON.parse(xhr.responseText);
                completeUpload(uploadId);
                resolve(result);
              } catch (parseError) {
                errorUpload(uploadId, 'Invalid response format');
                reject(new Error('Invalid response format'));
              }
            } else {
              try {
                const errorResult = JSON.parse(xhr.responseText);
                const errorMsg = errorResult.message || 'Upload failed';
                errorUpload(uploadId, errorMsg);
                reject(new Error(errorMsg));
              } catch {
                const errorMsg = `Upload failed with status ${xhr.status}`;
                errorUpload(uploadId, errorMsg);
                reject(new Error(errorMsg));
              }
            }
          });

          xhr.addEventListener('error', () => {
            const errorMsg = 'Network error during upload';
            errorUpload(uploadId, errorMsg);
            reject(new Error(errorMsg));
          });

          xhr.addEventListener('abort', () => {
            errorUpload(uploadId, 'Upload cancelled');
            reject(new Error('Upload cancelled'));
          });

          xhr.open('POST', `/api/products/library/${productId}/mockups`);
          xhr.setRequestHeader('Authorization', `Bearer ${authToken}`);
          xhr.send(formData);
        });
      } catch (error) {
        errorUpload(uploadId, (error as Error).message);
        throw error;
      }
    },
    onSuccess: (result) => {
      toast({
        title: 'Mockup Uploaded!',
        description: 'The mockup has been processed and saved to the product library',
        variant: 'default',
      });
      
      // Invalidate and refetch mockups with broader cache invalidation
      queryClient.invalidateQueries({
        queryKey: ['/api/products/library', productId]
      });
      
      // Also invalidate main products library cache if needed
      queryClient.invalidateQueries({
        queryKey: ['/api/products/library']
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
      if (!response.ok) throw new Error('Failed to delete mockup');
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Mockup Deleted',
        description: 'The mockup has been removed',
        variant: 'default',
      });
      queryClient.invalidateQueries({
        queryKey: ['/api/products/library', productId, 'mockups']
      });
    },
  });

  // Get current upload progress for a file
  const getCurrentUploadProgress = () => {
    const activeUploads = uploads.filter(u => u.status === 'uploading');
    return activeUploads.length > 0 ? activeUploads[0] : null;
  };

  return {
    // Data
    mockups: (mockupsData as any)?.mockups || [],
    statistics: (mockupsData as any)?.statistics,
    productInfo: (mockupsData as any)?.product_info,
    
    // Loading states
    isLoading,
    error,
    
    // Upload functionality
    uploadMockup: uploadMockupMutation.mutate,
    isUploading: uploadMockupMutation.isPending,
    uploadError: uploadMockupMutation.error,
    
    // Progress tracking (unified with existing system)
    uploads,
    currentUpload: getCurrentUploadProgress(),
    cancelUpload,
    
    // Additional actions
    deleteMockup: deleteMockupMutation.mutate,
    isDeleting: deleteMockupMutation.isPending,
    
    // Utility functions
    refetchMockups: refetch,
  };
}
