
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface Mockup {
  id: number;
  product_library_id: number;
  image_url: string;
  thumbnail_url: string;
  medium_url: string;
  original_url: string;
  mockup_type: string;
  view_angle: string;
  is_primary: boolean;
  display_order: number;
  uploaded_by: string;
  designer_notes: string;
  client_approved: boolean;
  approval_date: string | null;
  created_at: string;
  updated_at: string;
}

interface UploadMockupData {
  mockup_type?: string;
  view_angle?: string;
  is_primary?: boolean;
  designer_notes?: string;
}

export function useProductMockups(productId: number | string) {
  const [uploadProgress, setUploadProgress] = useState(0);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch mockups for a product
  const { data: mockupsData, isLoading, error } = useQuery({
    queryKey: ['/api/products/library', productId, 'mockups'],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/products/library/${productId}/mockups`);
      if (!response.ok) throw new Error('Failed to fetch mockups');
      return response.json();
    },
    enabled: !!productId,
  });

  // Upload mockup mutation
  const uploadMockupMutation = useMutation({
    mutationFn: async ({ file, data }: { file: File; data: UploadMockupData }) => {
      const formData = new FormData();
      formData.append('mockup', file);
      
      // Add metadata
      Object.entries(data).forEach(([key, value]) => {
        if (value !== undefined) {
          formData.append(key, String(value));
        }
      });

      // Get auth token
      const authToken = localStorage.getItem('authToken') || 
                       localStorage.getItem('token') || 
                       'dev-admin-token-12345';

      // Create XMLHttpRequest for progress tracking
      const xhr = new XMLHttpRequest();
      
      return new Promise((resolve, reject) => {
        xhr.upload.addEventListener('progress', (event) => {
          if (event.lengthComputable) {
            const progress = Math.round((event.loaded / event.total) * 100);
            setUploadProgress(progress);
          }
        });

        xhr.addEventListener('load', () => {
          setUploadProgress(0);
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const result = JSON.parse(xhr.responseText);
              resolve(result);
            } catch (parseError) {
              reject(new Error('Invalid response format'));
            }
          } else {
            try {
              const errorResult = JSON.parse(xhr.responseText);
              reject(new Error(errorResult.message || 'Upload failed'));
            } catch {
              reject(new Error(`Upload failed with status ${xhr.status}`));
            }
          }
        });

        xhr.addEventListener('error', () => {
          setUploadProgress(0);
          reject(new Error('Network error during upload'));
        });

        xhr.open('POST', `/api/products/library/${productId}/mockups`);
        xhr.setRequestHeader('Authorization', `Bearer ${authToken}`);
        xhr.send(formData);
      });
    },
    onSuccess: () => {
      toast({
        title: 'Mockup Uploaded!',
        description: 'The mockup has been saved to the product library',
        variant: 'default',
      });
      
      // Invalidate and refetch mockups
      queryClient.invalidateQueries({
        queryKey: ['/api/products/library', productId, 'mockups']
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Upload Failed',
        description: error.message,
        variant: 'destructive',
      });
      setUploadProgress(0);
    },
  });

  // Approve mockup mutation
  const approveMockupMutation = useMutation({
    mutationFn: async ({ mockupId, approved }: { mockupId: number; approved: boolean }) => {
      const response = await apiRequest('PATCH', `/api/products/library/mockups/${mockupId}`, {
        client_approved: approved,
        approval_date: approved ? new Date().toISOString() : null
      });
      if (!response.ok) throw new Error('Failed to update mockup approval');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['/api/products/library', productId, 'mockups']
      });
    },
  });

  return {
    mockups: mockupsData?.mockups || [],
    isLoading,
    error,
    uploadProgress,
    uploadMockup: uploadMockupMutation.mutate,
    isUploading: uploadMockupMutation.isPending,
    approveMockup: approveMockupMutation.mutate,
    isUpdating: approveMockupMutation.isPending,
  };
}
