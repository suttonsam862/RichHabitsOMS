import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Upload, X, Image as ImageIcon, Eye, Trash2 } from 'lucide-react';

interface ProductionImage {
  id: string;
  url: string;
  filename: string;
  originalName: string;
  size: number;
  mimeType: string;
  caption: string;
  stage: string;
  taskType: string;
  taskId?: string;
  uploadedAt: string;
}

interface ProductionImageUploaderProps {
  orderId: string;
  taskType?: 'production' | 'design';
  taskId?: string;
  stage?: string;
  onUploadSuccess?: (images: ProductionImage[]) => void;
  existingImages?: ProductionImage[];
  className?: string;
}

const PRODUCTION_STAGES = [
  { value: 'cutting', label: 'Cutting' },
  { value: 'sewing', label: 'Sewing' },
  { value: 'assembly', label: 'Assembly' },
  { value: 'quality_check', label: 'Quality Check' },
  { value: 'packaging', label: 'Packaging' },
  { value: 'completed', label: 'Completed' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'review', label: 'Review' }
];

export function ProductionImageUploader({
  orderId,
  taskType = 'production',
  taskId,
  stage = 'in_progress',
  onUploadSuccess,
  existingImages = [],
  className = ''
}: ProductionImageUploaderProps) {
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [selectedStage, setSelectedStage] = useState(stage);
  const [caption, setCaption] = useState('');
  const [images, setImages] = useState<ProductionImage[]>(existingImages);
  const [previewFiles, setPreviewFiles] = useState<File[]>([]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    // Validate file types and sizes
    const validFiles = acceptedFiles.filter(file => {
      const isValidType = file.type.startsWith('image/');
      const isValidSize = file.size <= 5 * 1024 * 1024; // 5MB
      
      if (!isValidType) {
        toast({
          title: "Invalid file type",
          description: `${file.name} is not a valid image file. Please select a JPEG, PNG, or WebP image.`,
          variant: "destructive"
        });
        return false;
      }
      
      if (!isValidSize) {
        toast({
          title: "File too large",
          description: `${file.name} exceeds 5MB limit. Please compress the image or choose a smaller file.`,
          variant: "destructive"
        });
        return false;
      }
      
      return true;
    });

    setPreviewFiles(prev => [...prev, ...validFiles]);
  }, [toast]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.webp']
    },
    maxFiles: 10,
    multiple: true
  });

  const removePreviewFile = (index: number) => {
    setPreviewFiles(prev => prev.filter((_, i) => i !== index));
  };

  const uploadImages = async () => {
    if (previewFiles.length === 0) {
      toast({
        title: "No files selected",
        description: "Please select images to upload",
        variant: "destructive"
      });
      return;
    }

    setUploading(true);

    try {
      const formData = new FormData();
      
      // Add files
      previewFiles.forEach(file => {
        formData.append('images', file);
      });
      
      // Add metadata
      formData.append('taskType', taskType);
      if (taskId) formData.append('taskId', taskId);
      formData.append('stage', selectedStage);
      formData.append('caption', caption || `Production progress - ${selectedStage}`);

      const response = await fetch(`/api/orders/${orderId}/images/production`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: formData
      });

      const result = await response.json();

      if (result.success) {
        const newImages = [...images, ...result.images];
        setImages(newImages);
        setPreviewFiles([]);
        setCaption('');
        
        toast({
          title: "Upload successful",
          description: `Uploaded ${result.images.length} production images`
        });

        onUploadSuccess?.(result.images);
      } else {
        throw new Error(result.message || 'Upload failed');
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : 'Failed to upload images',
        variant: "destructive"
      });
    } finally {
      setUploading(false);
    }
  };

  const deleteImage = async (imageId: string) => {
    try {
      const response = await fetch(`/api/orders/${orderId}/images/production/${imageId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });

      const result = await response.json();

      if (result.success) {
        setImages(prev => prev.filter(img => img.id !== imageId));
        toast({
          title: "Image deleted",
          description: "Production image removed successfully"
        });
      } else {
        throw new Error(result.message || 'Delete failed');
      }
    } catch (error) {
      console.error('Delete error:', error);
      toast({
        title: "Delete failed",
        description: error instanceof Error ? error.message : 'Failed to delete image',
        variant: "destructive"
      });
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className={`space-y-6 ${className}`}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5" />
            Production Images Upload
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Upload Controls */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="stage">Production Stage</Label>
              <Select value={selectedStage} onValueChange={setSelectedStage}>
                <SelectTrigger>
                  <SelectValue placeholder="Select stage" />
                </SelectTrigger>
                <SelectContent>
                  {PRODUCTION_STAGES.map(stage => (
                    <SelectItem key={stage.value} value={stage.value}>
                      {stage.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="caption">Caption (Optional)</Label>
              <Input
                id="caption"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Describe the current progress..."
              />
            </div>
          </div>

          {/* Dropzone */}
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
              isDragActive 
                ? 'border-blue-400 bg-blue-50 dark:bg-blue-950' 
                : 'border-gray-300 dark:border-gray-600 hover:border-gray-400'
            }`}
          >
            <input {...getInputProps()} />
            <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            {isDragActive ? (
              <p className="text-blue-600 dark:text-blue-400">Drop the images here...</p>
            ) : (
              <div>
                <p className="text-gray-600 dark:text-gray-400 mb-2">
                  Drag & drop production images here, or click to select
                </p>
                <p className="text-sm text-gray-500">
                  Supports JPEG, PNG, WebP • Max 5MB per file • Up to 10 files
                </p>
              </div>
            )}
          </div>

          {/* Preview Files */}
          {previewFiles.length > 0 && (
            <div className="space-y-2">
              <Label>Files to Upload ({previewFiles.length})</Label>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {previewFiles.map((file, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <ImageIcon className="h-4 w-4 text-gray-500 flex-shrink-0" />
                      <span className="text-sm truncate">{file.name}</span>
                      <Badge variant="outline" className="text-xs">
                        {formatFileSize(file.size)}
                      </Badge>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removePreviewFile(index)}
                      className="flex-shrink-0"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Upload Button */}
          <Button 
            onClick={uploadImages} 
            disabled={uploading || previewFiles.length === 0}
            className="w-full"
          >
            {uploading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Upload {previewFiles.length} Image{previewFiles.length !== 1 ? 's' : ''}
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Existing Images */}
      {images.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Production Images ({images.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {images.map((image) => (
                <div key={image.id} className="border rounded-lg overflow-hidden">
                  <div className="aspect-video bg-gray-100 dark:bg-gray-800 relative">
                    <img
                      src={image.url}
                      alt={image.caption}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                    <div className="absolute top-2 right-2 flex gap-1">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => window.open(image.url, '_blank')}
                        className="p-1"
                      >
                        <Eye className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => deleteImage(image.id)}
                        className="p-1"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  <div className="p-3">
                    <div className="flex items-center justify-between mb-2">
                      <Badge variant="outline" className="text-xs">
                        {PRODUCTION_STAGES.find(s => s.value === image.stage)?.label || image.stage}
                      </Badge>
                      <span className="text-xs text-gray-500">
                        {formatFileSize(image.size)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                      {image.caption}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(image.uploadedAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}