/**
 * CUSTOMER PHOTO UPLOAD COMPONENT
 * Specialized photo upload component for customer profiles
 * Includes crash-resistant error handling and ResizeObserver protection
 */

import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Upload, X, User, Camera, AlertCircle } from 'lucide-react';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { useToast } from '@/hooks/use-toast';
import { validateFile } from '@/utils/fileValidation';
import { compressImage, shouldCompress, formatFileSize } from '@/utils/imageCompression';
import { cn } from '@/lib/utils';

interface CustomerPhotoUploadProps {
  customerId: string;
  currentPhotoUrl?: string;
  customerName: string;
  onUploadSuccess: (photoUrl: string) => void;
  disabled?: boolean;
}

export function CustomerPhotoUpload({
  customerId,
  currentPhotoUrl,
  customerName,
  onUploadSuccess,
  disabled = false
}: CustomerPhotoUploadProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Handle file selection with error protection
  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Clear previous errors
    setUploadError(null);

    try {
      // Validate file with enhanced error messages
      const validation = validateFile(file, { maxSizeMB: 10 });
      if (!validation.isValid) {
        setUploadError(validation.error || 'Invalid file selected');
        // Clear file input but keep dialog open
        event.target.value = '';
        return;
      }

      // Process and compress image if needed
      let fileToUse = file;
      if (shouldCompress(file)) {
        try {
          const compressed = await compressImage(file);
          fileToUse = compressed.file;
          console.log(`Compressed image: ${formatFileSize(file.size)} → ${formatFileSize(compressed.file.size)}`);
        } catch (compressionError) {
          console.warn('Image compression failed, using original:', compressionError);
          // Continue with original file if compression fails
        }
      }

      setSelectedFile(fileToUse);
      
      // Create preview URL with cleanup
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
      const newPreviewUrl = URL.createObjectURL(fileToUse);
      setPreviewUrl(newPreviewUrl);

    } catch (error: any) {
      console.error('File processing error:', error);
      setUploadError(error.message || 'Failed to process selected file');
      event.target.value = '';
    }
  };

  // Upload photo with comprehensive error handling
  const handleUpload = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    setUploadError(null);

    try {
      const formData = new FormData();
      formData.append('photo', selectedFile);

      const response = await fetch(`/api/customers/${customerId}/photo`, {
        method: 'POST',
        body: formData,
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });

      if (!response.ok) {
        let errorMessage = 'Failed to upload photo';
        
        if (response.status === 413) {
          errorMessage = 'File too large. Please select a smaller image.';
        } else if (response.status === 415) {
          errorMessage = 'Invalid file format. Please upload a JPG, PNG, or WebP image.';
        } else if (response.status === 401) {
          errorMessage = 'Authentication failed. Please refresh and try again.';
        } else if (response.status >= 500) {
          errorMessage = 'Server error. Please try again later.';
        }
        
        throw new Error(errorMessage);
      }

      const result = await response.json();
      
      toast({
        title: "Photo uploaded successfully",
        description: "Customer photo has been updated.",
      });

      // Call success callback
      onUploadSuccess(result.photoUrl);
      
      // Close dialog and cleanup
      setIsDialogOpen(false);
      resetUploadState();

    } catch (error: any) {
      console.error('Photo upload error:', error);
      setUploadError(error.message || 'Failed to upload photo');
      // Don't close dialog on error - let user retry
    } finally {
      setIsUploading(false);
    }
  };

  // Reset upload state
  const resetUploadState = () => {
    setSelectedFile(null);
    setUploadError(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Handle dialog close
  const handleDialogClose = (open: boolean) => {
    setIsDialogOpen(open);
    if (!open) {
      resetUploadState();
    }
  };



  return (
    <Dialog open={isDialogOpen} onOpenChange={handleDialogClose}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={disabled}
          className="flex items-center space-x-2"
        >
          <Camera className="h-4 w-4" />
          <span>{currentPhotoUrl ? 'Change Photo' : 'Add Photo'}</span>
        </Button>
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => {
        // Prevent dialog from closing when clicking outside during upload
        if (isUploading) {
          e.preventDefault();
        }
      }}>
        <DialogHeader>
          <DialogTitle>Upload Customer Photo</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Current photo display */}
          <div className="flex items-center space-x-4">
            <UserAvatar
              src={currentPhotoUrl || previewUrl || undefined}
              alt={customerName}
              fallbackText={customerName.charAt(0)}
              className="h-16 w-16"
            />
            <div>
              <h3 className="font-medium">{customerName}</h3>
              <p className="text-sm text-muted-foreground">
                {currentPhotoUrl ? 'Current photo' : 'No photo uploaded'}
              </p>
            </div>
          </div>

          {/* File input */}
          <div className="space-y-2">
            <Input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/webp"
              onChange={handleFileSelect}
              disabled={isUploading}
              className="cursor-pointer"
            />
            <p className="text-xs text-muted-foreground">
              Accepted formats: JPG, PNG, WebP. Maximum size: 10MB
            </p>
          </div>

          {/* Preview of selected file */}
          {previewUrl && (
            <div className="border rounded-lg p-4 space-y-2">
              <div className="flex items-center space-x-2">
                <img
                  src={previewUrl}
                  alt="Preview"
                  className="h-12 w-12 rounded object-cover"
                />
                <div className="flex-1">
                  <p className="text-sm font-medium">Ready to upload</p>
                  <p className="text-xs text-muted-foreground">
                    {selectedFile ? formatFileSize(selectedFile.size) : ''}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={resetUploadState}
                  disabled={isUploading}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Error display */}
          {uploadError && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
              <div className="flex items-start space-x-2">
                <AlertCircle className="h-4 w-4 text-destructive mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-destructive font-medium">Upload Error</p>
                  <p className="text-sm text-destructive/80">{uploadError}</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setUploadError(null)}
                  className="text-destructive hover:text-destructive"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex justify-end space-x-2">
            <Button
              variant="outline"
              onClick={() => handleDialogClose(false)}
              disabled={isUploading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpload}
              disabled={!selectedFile || isUploading}
              className={cn(
                "min-w-[100px]",
                isUploading && "cursor-not-allowed"
              )}
            >
              {isUploading ? (
                <>
                  <Upload className="h-4 w-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}