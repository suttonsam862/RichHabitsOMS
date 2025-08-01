/**
 * UNIFIED IMAGE UPLOADER COMPONENT
 * Single standardized component for all image uploads across the application
 * Replaces multiple scattered upload implementations
 */

import React, { useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Upload, X, Image as ImageIcon, CheckCircle, Clock, Zap } from 'lucide-react';
import { ProductImage } from '@/components/ui/FallbackImage';
import { cn } from '@/lib/utils';
import { validateFile } from '@/utils/fileValidation';
import { compressImage, shouldCompress, getCompressionSettings, formatFileSize, type CompressionResult } from '@/utils/imageCompression';
import { useUploadProgress } from '@/hooks/useUploadProgress';
import { v4 as uuidv4 } from 'uuid';

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
  const [retryCount, setRetryCount] = useState(0);
  const [compressionResult, setCompressionResult] = useState<CompressionResult | null>(null);
  const [isCompressing, setIsCompressing] = useState(false);
  
  // Real-time upload progress tracking
  const {
    uploads,
    startUpload,
    updateProgress,
    completeUpload,
    errorUpload,
    cancelUpload,
    clearCompleted,
    getUpload
  } = useUploadProgress();

  const maxSizeBytes = maxSizeMB * 1024 * 1024;

  const resetState = useCallback(() => {
    // Clean up previous preview URL to prevent memory leaks
    if (preview && preview.startsWith('blob:')) {
      URL.revokeObjectURL(preview);
    }
    
    setSelectedFile(null);
    setPreview(null);
    setUploadProgress(0);
    setUploadError(null);
    setUploadSuccess(false);
    setRetryCount(0);
  }, [preview]);

  const handleFileSelect = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file using centralized utility
    const validation = validateFile(file, { maxSizeMB });
    if (!validation.isValid) {
      setUploadError(validation.error || 'Invalid file');
      // Don't close dialog/popup - just show error message
      return;
    }

    setUploadError(null);
    setCompressionResult(null);
    
    // Clean up previous preview URL to prevent memory leaks
    if (preview && preview.startsWith('blob:')) {
      URL.revokeObjectURL(preview);
    }

    let fileToUse = file;
    
    // Compress image if needed
    if (shouldCompress(file, 1024)) { // 1MB threshold
      try {
        setIsCompressing(true);
        const settings = getCompressionSettings(file.size / 1024);
        const result = await compressImage(file, settings);
        
        setCompressionResult(result);
        fileToUse = result.file;
        
        console.log(`Image compressed: ${formatFileSize(result.originalSize)} → ${formatFileSize(result.compressedSize)} (${result.compressionRatio}% reduction)`);
      } catch (error) {
        console.warn('Image compression failed, using original:', error);
        // Continue with original file if compression fails
      } finally {
        setIsCompressing(false);
      }
    }
    
    setSelectedFile(fileToUse);

    // Generate preview using createObjectURL for better memory management
    if (showPreview) {
      const objectUrl = URL.createObjectURL(fileToUse);
      setPreview(objectUrl);
    }
  }, [maxSizeBytes, maxSizeMB, accept, showPreview, preview]);

  // Cleanup effect to prevent memory leaks on component unmount
  useEffect(() => {
    return () => {
      // Clean up preview URL when component unmounts
      if (preview && preview.startsWith('blob:')) {
        URL.revokeObjectURL(preview);
      }
    };
  }, [preview]);

  const handleUpload = useCallback(async () => {
    if (!selectedFile || !entityId) {
      setUploadError('No file selected or entity ID missing');
      return;
    }

    const uploadId = uuidv4();
    setIsUploading(true);
    setUploadProgress(0);
    setUploadError(null);

    // Start tracking upload progress
    startUpload(uploadId, selectedFile.name, selectedFile.size);

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
            updateProgress(uploadId, event.loaded);
            onUploadProgress?.(progress);
          }
        });

        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const result = JSON.parse(xhr.responseText);
              setUploadSuccess(true);
              completeUpload(uploadId);
              onUploadComplete({
                success: true,
                data: result.data
              });
              resolve();
            } catch (parseError) {
              const errorMessage = 'Invalid response format';
              errorUpload(uploadId, errorMessage);
              reject(new Error(errorMessage));
            }
          } else {
            try {
              const errorResult = JSON.parse(xhr.responseText);
              const errorMessage = errorResult.message || 'Upload failed';
              errorUpload(uploadId, errorMessage);
              reject(new Error(errorMessage));
            } catch {
              const errorMessage = `Upload failed with status ${xhr.status}`;
              errorUpload(uploadId, errorMessage);
              reject(new Error(errorMessage));
            }
          }
        });

        xhr.addEventListener('error', () => {
          const errorMessage = 'Network error during upload';
          errorUpload(uploadId, errorMessage);
          reject(new Error(errorMessage));
        });

        xhr.addEventListener('abort', () => {
          const errorMessage = 'Upload cancelled';
          errorUpload(uploadId, errorMessage);
          reject(new Error(errorMessage));
        });

        xhr.open('POST', endpoint);
        xhr.setRequestHeader('Authorization', `Bearer ${authToken}`);
        xhr.send(formData);
      });

    } catch (error: any) {
      setUploadError(error.message || 'Upload failed');
      setRetryCount(prev => prev + 1);
      onUploadComplete({
        success: false,
        error: error.message || 'Upload failed'
      });
    } finally {
      setIsUploading(false);
    }
  }, [selectedFile, entityId, uploadType, onUploadComplete, onUploadProgress, startUpload, updateProgress, completeUpload, errorUpload]);

  const retryUpload = useCallback(() => {
    setUploadError(null);
    setUploadProgress(0);
    handleUpload();
  }, [handleUpload]);

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
                  {formatFileSize(selectedFile.size)}
                  {compressionResult && (
                    <span className="text-green-600 ml-2">
                      (Compressed {compressionResult.compressionRatio}% from {formatFileSize(compressionResult.originalSize)})
                    </span>
                  )}
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

      {/* Compression Status */}
      {isCompressing && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
          <p className="text-sm text-blue-600">Compressing image for optimal upload...</p>
        </div>
      )}

      {/* Progress Bar with Real-time Details */}
      {isUploading && selectedFile && (
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Uploading...</span>
            <span>{uploadProgress}%</span>
          </div>
          <Progress value={uploadProgress} className="w-full" />
          
          {/* Real-time upload details */}
          {uploads.length > 0 && uploads.find(u => u.filename === selectedFile.name && u.status === 'uploading') && (() => {
            const currentUpload = uploads.find(u => u.filename === selectedFile.name && u.status === 'uploading');
            if (!currentUpload) return null;
            
            const formatFileSize = (bytes: number) => {
              if (bytes === 0) return '0 Bytes';
              const k = 1024;
              const sizes = ['Bytes', 'KB', 'MB', 'GB'];
              const i = Math.floor(Math.log(bytes) / Math.log(k));
              return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
            };
            
            const formatSpeed = (bytesPerSecond: number) => {
              return formatFileSize(bytesPerSecond) + '/s';
            };
            
            const formatTime = (seconds: number) => {
              if (seconds < 60) {
                return `${Math.round(seconds)}s`;
              } else if (seconds < 3600) {
                const minutes = Math.floor(seconds / 60);
                const remainingSeconds = Math.round(seconds % 60);
                return `${minutes}m ${remainingSeconds}s`;
              } else {
                const hours = Math.floor(seconds / 3600);
                const minutes = Math.floor((seconds % 3600) / 60);
                return `${hours}h ${minutes}m`;
              }
            };
            
            return (
              <div className="flex items-center gap-4 text-xs text-gray-500">
                <div className="flex items-center gap-1">
                  <span>{formatFileSize(currentUpload.uploadedBytes)} / {formatFileSize(currentUpload.totalBytes)}</span>
                </div>
                {currentUpload.speed > 0 && (
                  <div className="flex items-center gap-1">
                    <Zap className="h-3 w-3" />
                    <span>{formatSpeed(currentUpload.speed)}</span>
                  </div>
                )}
                {currentUpload.remainingTime > 0 && (
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    <span>{formatTime(currentUpload.remainingTime)} remaining</span>
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      )}

      {/* Error Message with Retry */}
      {uploadError && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md space-y-2">
          <p className="text-sm text-red-600">{uploadError}</p>
          {retryCount < 3 && selectedFile && (
            <div className="flex gap-2">
              <Button
                onClick={retryUpload}
                disabled={isUploading}
                variant="outline"
                size="sm"
                className="text-red-600 border-red-300 hover:bg-red-50"
              >
                Retry Upload
              </Button>
              <Button
                onClick={resetState}
                variant="ghost"
                size="sm"
                className="text-gray-600"
              >
                Reset
              </Button>
            </div>
          )}
          {retryCount >= 3 && (
            <p className="text-xs text-red-500">
              Maximum retry attempts reached. Please check your connection and try again later.
            </p>
          )}
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