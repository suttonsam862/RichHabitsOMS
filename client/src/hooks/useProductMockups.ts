import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface UploadProgressInfo {
  file: File;
  progress: number;
  status: 'uploading' | 'complete' | 'error';
  error?: string;
  mockupData?: any;
}

interface UseProductMockupsProps {
  productId: string;
  onUploadComplete?: () => void;
}

export function useProductMockups({ productId, onUploadComplete }: UseProductMockupsProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [uploadProgress, setUploadProgress] = useState<Map<string, UploadProgressInfo>>(new Map());

  // Upload mockup mutation
  const uploadMutation = useMutation({
    mutationFn: async ({ 
      file, 
      imageType, 
      altText 
    }: { 
      file: File; 
      imageType: string; 
      altText?: string; 
    }) => {
      const fileId = `${file.name}-${Date.now()}`;
      
      // Initialize upload progress
      setUploadProgress(prev => new Map(prev).set(fileId, {
        file,
        progress: 0,
        status: 'uploading'
      }));

      try {
        // Validate file
        if (!file.type.startsWith('image/')) {
          throw new Error('Only image files are allowed');
        }

        if (file.size > 10 * 1024 * 1024) { // 10MB limit
          throw new Error('File size must be less than 10MB');
        }

        // Create FormData
        const formData = new FormData();
        formData.append('mockup', file);
        formData.append('image_type', imageType);
        if (altText) {
          formData.append('alt_text', altText);
        }

        // Upload with progress tracking
        const response = await fetch(`/api/products/library/${productId}/mockups`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('authToken') || localStorage.getItem('token')}`,
          },
          body: formData,
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Upload failed');
        }

        const result = await response.json();
        
        // Update progress to complete
        setUploadProgress(prev => new Map(prev).set(fileId, {
          file,
          progress: 100,
          status: 'complete',
          mockupData: result.data
        }));

        return { ...result, fileId };

      } catch (error) {
        // Update progress to error
        setUploadProgress(prev => new Map(prev).set(fileId, {
          file,
          progress: 0,
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error'
        }));
        throw error;
      }
    },
    onSuccess: () => {
      // Invalidate and refetch mockups
      queryClient.invalidateQueries({ 
        queryKey: ['/api/products/library', productId, 'mockups'] 
      });
      onUploadComplete?.();
    },
    onError: (error: Error) => {
      toast({
        title: 'Upload Failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Upload multiple files
  const uploadMultipleFiles = async (files: File[], imageType: string, altTexts?: string[]) => {
    const promises = files.map((file, index) => 
      uploadMutation.mutateAsync({
        file,
        imageType,
        altText: altTexts?.[index] || `${imageType} for ${file.name}`
      })
    );

    try {
      const results = await Promise.allSettled(promises);
      
      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;

      if (successful > 0) {
        toast({
          title: 'Upload Complete',
          description: `${successful} file(s) uploaded successfully${failed > 0 ? `, ${failed} failed` : ''}`,
        });
      }

      return results;
    } catch (error) {
      console.error('Error uploading multiple files:', error);
      throw error;
    }
  };

  // Clear upload progress
  const clearUploadProgress = () => {
    setUploadProgress(new Map());
  };

  // Get upload progress for a specific file
  const getFileProgress = (fileName: string) => {
    for (const [fileId, progress] of uploadProgress.entries()) {
      if (progress.file.name === fileName) {
        return progress;
      }
    }
    return null;
  };

  // Get all upload progress
  const getAllProgress = () => {
    return Array.from(uploadProgress.values());
  };

  // Check if any uploads are in progress
  const isUploading = () => {
    return Array.from(uploadProgress.values()).some(p => p.status === 'uploading');
  };

  return {
    uploadMockup: uploadMutation.mutateAsync,
    uploadMultipleFiles,
    uploadProgress: getAllProgress(),
    getFileProgress,
    clearUploadProgress,
    isUploading: isUploading(),
    isPending: uploadMutation.isPending,
  };
}