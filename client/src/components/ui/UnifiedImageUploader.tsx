/**
 * UNIFIED IMAGE UPLOADER COMPONENT
 * Single standardized component for all image uploads across the application
 * Replaces multiple scattered upload implementations
 */

import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Upload, X, Image as ImageIcon, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface UploadResult {
  success: boolean;
  data?: {
    imageUrls: {
      thumbnail: string;
      medium: string;
      large: string;
      original: string;
    };
    metadata: any;
  };
  error?: string;
}

export interface UnifiedImageUploaderProps {
  /** Type of upload (catalog, design, order-item) */
  uploadType: 'catalog' | 'design' | 'order-item';
  
  /** ID of the entity (catalogItemId, taskId, orderItemId) */
  entityId: string;
  
  /** Callback when upload completes */
  onUploadComplete: (result: UploadResult) => void;
  
  /** Optional callback for upload progress */
  onUploadProgress?: (progress: number) => void;
  
  /** Accept specific file types (defaults to common image types) */
  accept?: string;
  
  /** Maximum file size in MB (defaults to 10) */
  maxSizeMB?: number;
  
  /** Show preview of selected image */
  showPreview?: boolean;
  
  /** Custom styling */
  className?: string;
  
  /** Disabled state */
  disabled?: boolean;
  
  /** Current image URL for display */
  currentImageUrl?: string;
}

export function UnifiedImageUploader({
  uploadType,
  entityId,
  onUploadComplete,
  onUploadProgress,
  accept = "image/jpeg,image/jpg,image/png,image/webp",
  maxSizeMB = 10,
  showPreview = true,
  className,
  disabled = false,
  currentImageUrl
}: UnifiedImageUploaderProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  const maxSizeBytes = maxSizeMB * 1024 * 1024;

  const resetState = useCallback(() => {
    setSelectedFile(null);
    setPreview(null);
    setUploadProgress(0);
    setUploadError(null);
    setUploadSuccess(false);
  }, []);

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file size
    if (file.size > maxSizeBytes) {
      setUploadError(`File size must be less than ${maxSizeMB}MB`);
      return;
    }

    // Validate file type
    if (!accept.split(',').some(type => file.type === type.trim())) {
      setUploadError('Invalid file type. Please select a valid image file.');
      return;
    }

    setUploadError(null);
    setSelectedFile(file);

    // Generate preview
    if (showPreview) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  }, [maxSizeBytes, maxSizeMB, accept, showPreview]);

  const handleUpload = useCallback(async () => {
    if (!selectedFile || !entityId) {
      setUploadError('No file selected or entity ID missing');
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    setUploadError(null);

    try {
      const formData = new FormData();
      
      // Use appropriate field name based on upload type
      const fieldName = uploadType === 'design' ? 'file' : 'image';
      formData.append(fieldName, selectedFile);

      // Construct API endpoint
      const endpoint = `/api/images-unified/${uploadType}/${entityId}`;

      // Get auth token
      const authToken = localStorage.getItem('authToken') || 
                       localStorage.getItem('token') || 
                       'dev-admin-token-12345';

      // Create XMLHttpRequest for progress tracking
      const xhr = new XMLHttpRequest();
      
      return new Promise<void>((resolve, reject) => {
        xhr.upload.addEventListener('progress', (event) => {
          if (event.lengthComputable) {
            const progress = Math.round((event.loaded / event.total) * 100);
            setUploadProgress(progress);
            onUploadProgress?.(progress);
          }
        });

        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const result = JSON.parse(xhr.responseText);
              setUploadSuccess(true);
              onUploadComplete({
                success: true,
                data: result.data
              });
              resolve();
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
          reject(new Error('Network error during upload'));
        });

        xhr.open('POST', endpoint);
        xhr.setRequestHeader('Authorization', `Bearer ${authToken}`);
        xhr.send(formData);
      });

    } catch (error: any) {
      setUploadError(error.message || 'Upload failed');
      onUploadComplete({
        success: false,
        error: error.message || 'Upload failed'
      });
    } finally {
      setIsUploading(false);
    }
  }, [selectedFile, entityId, uploadType, onUploadComplete, onUploadProgress]);

  const removeFile = useCallback(() => {
    setSelectedFile(null);
    setPreview(null);
    setUploadError(null);
    setUploadSuccess(false);
    
    // Clear file input
    const fileInput = document.getElementById('file-input') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  }, []);

  return (
    <div className={cn("space-y-4", className)}>
      {/* File Selection */}
      <div className="space-y-2">
        <Label htmlFor="file-input" className="text-sm font-medium">
          {uploadType === 'design' ? 'Design File' : 'Image File'}
        </Label>
        
        <div className={cn(
          "border-2 border-dashed rounded-lg p-6 text-center transition-colors",
          selectedFile ? "border-green-300 bg-green-50" : "border-gray-300 hover:border-gray-400",
          disabled && "opacity-50 cursor-not-allowed"
        )}>
          {!selectedFile ? (
            <div className="space-y-3">
              <Upload className="mx-auto h-12 w-12 text-gray-400" />
              <div>
                <Label htmlFor="file-input" className="cursor-pointer">
                  <span className="text-blue-600 hover:text-blue-800 font-medium">
                    Choose a file
                  </span>
                </Label>
                <p className="text-sm text-gray-500 mt-1">
                  {accept.split(',').map(type => type.split('/')[1]).join(', ').toUpperCase()} up to {maxSizeMB}MB
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {uploadSuccess ? (
                <CheckCircle className="mx-auto h-12 w-12 text-green-500" />
              ) : (
                <ImageIcon className="mx-auto h-12 w-12 text-blue-500" />
              )}
              <div>
                <p className="font-medium text-gray-900">{selectedFile.name}</p>
                <p className="text-sm text-gray-500">
                  {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
              {!uploadSuccess && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={removeFile}
                  disabled={isUploading}
                >
                  <X className="w-4 h-4 mr-1" />
                  Remove
                </Button>
              )}
            </div>
          )}
        </div>

        <Input
          id="file-input"
          type="file"
          accept={accept}
          onChange={handleFileSelect}
          disabled={disabled || isUploading}
          className="hidden"
        />
      </div>

      {/* Preview */}
      {showPreview && (preview || currentImageUrl) && (
        <div className="space-y-2">
          <Label className="text-sm font-medium">Preview</Label>
          <div className="border rounded-lg p-2 bg-gray-50">
            <img
              src={preview || currentImageUrl}
              alt="Preview"
              className="max-w-full max-h-48 mx-auto rounded"
            />
          </div>
        </div>
      )}

      {/* Progress Bar */}
      {isUploading && (
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Uploading...</span>
            <span>{uploadProgress}%</span>
          </div>
          <Progress value={uploadProgress} className="w-full" />
        </div>
      )}

      {/* Error Message */}
      {uploadError && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-600">{uploadError}</p>
        </div>
      )}

      {/* Success Message */}
      {uploadSuccess && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-md">
          <p className="text-sm text-green-600">
            {uploadType === 'design' ? 'Design file' : 'Image'} uploaded successfully!
          </p>
        </div>
      )}

      {/* Upload Button */}
      <div className="flex justify-end space-x-2">
        {selectedFile && !uploadSuccess && (
          <Button
            onClick={handleUpload}
            disabled={isUploading || disabled}
            className="min-w-[100px]"
          >
            {isUploading ? 'Uploading...' : 'Upload'}
          </Button>
        )}
        
        {uploadSuccess && (
          <Button
            onClick={resetState}
            variant="outline"
          >
            Upload Another
          </Button>
        )}
      </div>
    </div>
  );
}

export default UnifiedImageUploader;