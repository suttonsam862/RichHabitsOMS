/**
 * PROGRESSIVE FILE UPLOAD COMPONENT
 * File upload component with real-time progress tracking and drag & drop
 */

import React, { useCallback, useState, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { UploadProgressPanel } from './UploadProgressPanel';
import { useUploadProgress } from '@/hooks/useUploadProgress';
import { 
  Upload, 
  FileImage, 
  X, 
  Cloud,
  AlertCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { v4 as uuidv4 } from 'uuid';

interface ProgressiveFileUploadProps {
  onUploadComplete?: (files: { id: string; url: string; filename: string; path: string }[]) => void;
  onUploadError?: (error: string) => void;
  acceptedFileTypes?: string[];
  maxFileSize?: number; // in bytes
  maxFiles?: number;
  bucket?: string;
  pathPrefix?: string;
  className?: string;
  disabled?: boolean;
  multiple?: boolean;
}

export const ProgressiveFileUpload: React.FC<ProgressiveFileUploadProps> = ({
  onUploadComplete,
  onUploadError,
  acceptedFileTypes = ['image/*'],
  maxFileSize = 10 * 1024 * 1024, // 10MB default
  maxFiles = 10,
  bucket = 'uploads',
  pathPrefix = '',
  className = '',
  disabled = false,
  multiple = true
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [completedFiles, setCompletedFiles] = useState<{ id: string; url: string; filename: string; path: string }[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const {
    uploads,
    startUpload,
    updateProgress,
    completeUpload,
    errorUpload,
    cancelUpload,
    clearCompleted,
    clearAll
  } = useUploadProgress();

  const uploadFile = useCallback(async (file: File) => {
    const uploadId = uuidv4();
    const fileName = `${Date.now()}-${file.name}`;
    const filePath = pathPrefix ? `${pathPrefix}/${fileName}` : fileName;

    // Start tracking upload
    startUpload(uploadId, file.name, file.size);

    try {
      // Create form data
      const formData = new FormData();
      formData.append('file', file);

      // Create XMLHttpRequest for progress tracking
      const xhr = new XMLHttpRequest();

      return new Promise<{ id: string; url: string; filename: string; path: string }>((resolve, reject) => {
        // Track upload progress
        xhr.upload.addEventListener('progress', (event) => {
          if (event.lengthComputable) {
            updateProgress(uploadId, event.loaded);
          }
        });

        // Handle completion
        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const response = JSON.parse(xhr.responseText);
              if (response.success) {
                completeUpload(uploadId);
                const result = {
                  id: uploadId,
                  url: response.data.url || response.data.publicUrl,
                  filename: file.name,
                  path: response.data.path || filePath
                };
                setCompletedFiles(prev => [...prev, result]);
                resolve(result);
              } else {
                throw new Error(response.message || 'Upload failed');
              }
            } catch (error) {
              const errorMessage = 'Failed to parse upload response';
              errorUpload(uploadId, errorMessage);
              reject(new Error(errorMessage));
            }
          } else {
            const errorMessage = `Upload failed with status ${xhr.status}`;
            errorUpload(uploadId, errorMessage);
            reject(new Error(errorMessage));
          }
        });

        // Handle errors
        xhr.addEventListener('error', () => {
          const errorMessage = 'Network error during upload';
          errorUpload(uploadId, errorMessage);
          reject(new Error(errorMessage));
        });

        // Handle abort
        xhr.addEventListener('abort', () => {
          const errorMessage = 'Upload cancelled';
          errorUpload(uploadId, errorMessage);
          reject(new Error(errorMessage));
        });

        // Start upload to our API endpoint
        xhr.open('POST', '/api/images-unified/upload');
        
        // Add authentication header if available
        const authToken = localStorage.getItem('authToken');
        if (authToken) {
          xhr.setRequestHeader('Authorization', `Bearer ${authToken}`);
        }

        xhr.send(formData);
      });

    } catch (error: any) {
      errorUpload(uploadId, error.message || 'Upload failed');
      throw error;
    }
  }, [pathPrefix, startUpload, updateProgress, completeUpload, errorUpload]);

  const handleFiles = useCallback(async (files: File[]) => {
    if (disabled) return;

    // Validate file count
    const totalFiles = uploads.filter(u => u.status === 'uploading').length + files.length;
    if (totalFiles > maxFiles) {
      onUploadError?.(`Cannot upload more than ${maxFiles} files`);
      return;
    }

    const validFiles: File[] = [];
    const errors: string[] = [];

    // Validate each file
    for (const file of files) {
      // Check file size
      if (file.size > maxFileSize) {
        errors.push(`${file.name}: File size exceeds ${Math.round(maxFileSize / (1024 * 1024))}MB limit`);
        continue;
      }

      // Check file type
      const isValidType = acceptedFileTypes.some(type => {
        if (type.endsWith('/*')) {
          return file.type.startsWith(type.slice(0, -1));
        }
        return file.type === type;
      });

      if (!isValidType) {
        errors.push(`${file.name}: File type not supported`);
        continue;
      }

      validFiles.push(file);
    }

    // Report validation errors
    if (errors.length > 0) {
      onUploadError?.(errors.join('\n'));
    }

    // Upload valid files
    if (validFiles.length > 0) {
      try {
        const uploadPromises = validFiles.map(file => uploadFile(file));
        const results = await Promise.allSettled(uploadPromises);
        
        const successful = results
          .filter((result): result is PromiseFulfilledResult<{ id: string; url: string; filename: string; path: string }> => 
            result.status === 'fulfilled'
          )
          .map(result => result.value);

        const failed = results
          .filter((result): result is PromiseRejectedResult => result.status === 'rejected')
          .map(result => result.reason.message);

        if (successful.length > 0) {
          onUploadComplete?.(successful);
        }

        if (failed.length > 0) {
          onUploadError?.(failed.join('\n'));
        }
      } catch (error: any) {
        onUploadError?.(error.message || 'Upload failed');
      }
    }
  }, [disabled, uploads, maxFiles, maxFileSize, acceptedFileTypes, onUploadError, onUploadComplete, uploadFile]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    handleFiles(acceptedFiles);
  }, [handleFiles]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: acceptedFileTypes.reduce((acc, type) => {
      acc[type] = [];
      return acc;
    }, {} as Record<string, string[]>),
    maxSize: maxFileSize,
    multiple,
    disabled,
    onDragEnter: () => setIsDragging(true),
    onDragLeave: () => setIsDragging(false),
    onDropAccepted: () => setIsDragging(false),
    onDropRejected: () => setIsDragging(false)
  });

  const handleFileInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length > 0) {
      handleFiles(files);
    }
    // Reset input value
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleCancel = useCallback((uploadId: string) => {
    cancelUpload(uploadId);
  }, [cancelUpload]);

  const handleRemove = useCallback((uploadId: string) => {
    // Remove from completed files as well
    setCompletedFiles(prev => prev.filter(file => file.id !== uploadId));
  }, []);

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* Upload Area */}
      <Card 
        className={cn(
          "border-2 border-dashed transition-all duration-200",
          isDragActive || isDragging 
            ? "border-blue-500 bg-blue-50" 
            : "border-gray-300 hover:border-gray-400",
          disabled && "opacity-50 cursor-not-allowed"
        )}
      >
        <CardContent className="p-8">
          <div 
            {...getRootProps()} 
            className="text-center cursor-pointer"
          >
            <input {...getInputProps()} />
            
            <div className="space-y-4">
              <div className="flex justify-center">
                {isDragActive || isDragging ? (
                  <Cloud className="h-12 w-12 text-blue-500" />
                ) : (
                  <Upload className="h-12 w-12 text-gray-400" />
                )}
              </div>
              
              <div>
                <h3 className="text-lg font-semibold text-gray-700">
                  {isDragActive 
                    ? "Drop files here..." 
                    : "Drag & drop files here"
                  }
                </h3>
                <p className="text-gray-500 mt-1">
                  or{" "}
                  <span className="text-blue-500 hover:text-blue-600 font-medium">
                    browse files
                  </span>
                </p>
              </div>
              
              <div className="text-sm text-gray-400 space-y-1">
                <p>
                  Supports: {acceptedFileTypes.join(', ')}
                </p>
                <p>
                  Max file size: {formatFileSize(maxFileSize)}
                </p>
                <p>
                  Max files: {maxFiles}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Alternative File Input */}
      <div className="flex items-center gap-4">
        <Label htmlFor="file-input" className="text-sm font-medium">
          Or select files:
        </Label>
        <Input
          ref={fileInputRef}
          id="file-input"
          type="file"
          multiple={multiple}
          accept={acceptedFileTypes.join(',')}
          onChange={handleFileInputChange}
          disabled={disabled}
          className="flex-1"
        />
      </div>

      {/* Upload Progress Panel */}
      {uploads.length > 0 && (
        <UploadProgressPanel
          uploads={uploads}
          onCancel={handleCancel}
          onRemove={handleRemove}
          onClearCompleted={clearCompleted}
          onClearAll={clearAll}
          defaultOpen={true}
        />
      )}

      {/* Upload Summary */}
      {completedFiles.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <FileImage className="h-4 w-4 text-green-500" />
              <span className="text-sm font-medium text-green-700">
                {completedFiles.length} file{completedFiles.length !== 1 ? 's' : ''} uploaded successfully
              </span>
            </div>
            <div className="space-y-1">
              {completedFiles.map((file) => (
                <div key={file.id} className="text-xs text-gray-600 flex items-center justify-between">
                  <span className="truncate">{file.filename}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemove(file.id)}
                    className="h-6 w-6 p-0 text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};