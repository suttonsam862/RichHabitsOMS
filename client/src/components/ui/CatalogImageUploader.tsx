import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Upload, X, Image as ImageIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface CatalogImageUploaderProps {
  catalogItemId: string;
  onUploadSuccess?: (imageData: any) => void;
  className?: string;
}

export default function CatalogImageUploader({ 
  catalogItemId, 
  onUploadSuccess, 
  className = '' 
}: CatalogImageUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file type",
        description: "Please select an image file (PNG, JPG, or WebP)",
        variant: "destructive"
      });
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please select an image smaller than 10MB",
        variant: "destructive"
      });
      return;
    }

    // Create preview
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);

    // Upload the file
    uploadImage(file);
  };

  const uploadImage = async (file: File) => {
    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append('image', file);

      const token = localStorage.getItem('authToken');
      const response = await fetch(`/api/catalog/${catalogItemId}/upload-image`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Upload failed');
      }

      toast({
        title: "Image uploaded successfully",
        description: `Image added to catalog item${result.data.isPrimary ? ' as primary image' : ''}. Storage: ${result.data.storageDeleted !== false ? 'Success' : 'Warning'}`,
      });

      // Call success callback
      if (onUploadSuccess) {
        onUploadSuccess(result.data);
      }

      // Clear preview
      setPreviewUrl(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

    } catch (error: any) {
      console.error('Upload error:', error);
      toast({
        title: "Upload failed",
        description: error.message || "Failed to upload image. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
    }
  };

  const clearPreview = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className={`space-y-4 ${className}`}>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />

      {previewUrl ? (
        <Card>
          <CardContent className="p-4">
            <div className="relative">
              <img
                src={previewUrl}
                alt="Preview"
                className="w-full h-48 object-cover rounded-lg"
              />
              <Button
                variant="destructive"
                size="sm"
                className="absolute top-2 right-2"
                onClick={clearPreview}
                disabled={isUploading}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            {isUploading && (
              <div className="mt-3 flex items-center justify-center text-sm text-muted-foreground">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary mr-2"></div>
                Uploading image...
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card className="border-dashed">
          <CardContent className="p-6">
            <div className="text-center">
              <ImageIcon className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-sm font-medium mb-2">Upload Image</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Add an image to this catalog item
              </p>
              <Button
                onClick={triggerFileSelect}
                disabled={isUploading}
                className="w-full sm:w-auto"
              >
                <Upload className="h-4 w-4 mr-2" />
                Select Image
              </Button>
              <p className="text-xs text-muted-foreground mt-2">
                PNG, JPG, WebP up to 10MB
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}