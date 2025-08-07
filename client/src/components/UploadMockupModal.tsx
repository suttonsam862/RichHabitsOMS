import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Upload,
  X,
  Image as ImageIcon,
  AlertCircle,
  CheckCircle,
  FileText,
  Loader2
} from 'lucide-react';
import { useProductMockups } from '@/hooks/useProductMockups';
import { cn } from '@/lib/utils';

interface UploadMockupModalProps {
  isOpen: boolean;
  onClose: () => void;
  productId: string;
  productName: string;
}

interface FileWithPreview extends File {
  preview?: string;
  id: string;
  imageType: string;
  altText: string;
}

const IMAGE_TYPES = [
  { value: 'mockup', label: 'Mockup', description: 'Product mockup or concept design' },
  { value: 'product_photo', label: 'Product Photo', description: 'Actual product photograph' },
  { value: 'design_proof', label: 'Design Proof', description: 'Design approval or proof' },
  { value: 'size_chart', label: 'Size Chart', description: 'Size reference chart' },
  { value: 'color_reference', label: 'Color Reference', description: 'Color options or swatches' },
  { value: 'technical_drawing', label: 'Technical Drawing', description: 'Technical specifications or drawings' },
  { value: 'primary', label: 'Primary Image', description: 'Main product image' },
];

export function UploadMockupModal({ 
  isOpen, 
  onClose, 
  productId, 
  productName 
}: UploadMockupModalProps) {
  const [files, setFiles] = useState<FileWithPreview[]>([]);
  const [defaultImageType, setDefaultImageType] = useState<string>('mockup');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    uploadMultipleFiles,
    uploadProgress,
    isUploading,
    clearUploadProgress,
  } = useProductMockups({
    productId,
    onUploadComplete: () => {
      setFiles([]);
      clearUploadProgress();
      setIsSubmitting(false);
      onClose();
    },
  });

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles: FileWithPreview[] = acceptedFiles.map((file) => {
      const fileWithPreview = file as FileWithPreview;
      fileWithPreview.preview = URL.createObjectURL(file);
      fileWithPreview.id = `${file.name}-${Date.now()}-${Math.random()}`;
      fileWithPreview.imageType = defaultImageType;
      fileWithPreview.altText = `${defaultImageType} for ${productName}`;
      return fileWithPreview;
    });

    setFiles(prev => [...prev, ...newFiles]);
  }, [defaultImageType, productName]);

  const {
    getRootProps,
    getInputProps,
    isDragActive,
    fileRejections,
  } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.webp']
    },
    maxSize: 10 * 1024 * 1024, // 10MB
    multiple: true,
  });

  const removeFile = (fileId: string) => {
    setFiles(prev => {
      const updated = prev.filter(f => f.id !== fileId);
      // Revoke URL for the removed file
      const removedFile = prev.find(f => f.id === fileId);
      if (removedFile?.preview) {
        URL.revokeObjectURL(removedFile.preview);
      }
      return updated;
    });
  };

  const updateFileProperty = (fileId: string, property: keyof FileWithPreview, value: string) => {
    setFiles(prev => prev.map(file => 
      file.id === fileId ? { ...file, [property]: value } : file
    ));
  };

  const handleSubmit = async () => {
    if (files.length === 0) return;

    setIsSubmitting(true);
    try {
      await uploadMultipleFiles(
        files,
        defaultImageType, // Use default for all files, individual types are handled per file
        files.map(f => f.altText)
      );
    } catch (error) {
      console.error('Upload error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (isUploading || isSubmitting) return;

    // Clean up preview URLs
    files.forEach(file => {
      if (file.preview) {
        URL.revokeObjectURL(file.preview);
      }
    });

    setFiles([]);
    clearUploadProgress();
    setIsSubmitting(false);
    onClose();
  };

  const canSubmit = files.length > 0 && !isUploading && !isSubmitting;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Upload className="h-5 w-5" />
            <span>Upload Mockups for {productName}</span>
          </DialogTitle>
          <DialogDescription>
            Upload mockup images, product photos, or design assets. Multiple files can be uploaded at once.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Default Image Type Selector */}
          <div className="space-y-2">
            <Label htmlFor="default-image-type">Default Image Type</Label>
            <Select value={defaultImageType} onValueChange={setDefaultImageType}>
              <SelectTrigger>
                <SelectValue placeholder="Select default image type" />
              </SelectTrigger>
              <SelectContent>
                {IMAGE_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    <div className="flex flex-col">
                      <span>{type.label}</span>
                      <span className="text-xs text-muted-foreground">{type.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* File Drop Zone */}
          <Card>
            <CardContent className="pt-6">
              <div
                {...getRootProps()}
                className={cn(
                  "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors",
                  isDragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25",
                  "hover:border-primary hover:bg-primary/5"
                )}
              >
                <input {...getInputProps()} />
                <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                {isDragActive ? (
                  <p className="text-lg font-medium">Drop files here...</p>
                ) : (
                  <div className="space-y-2">
                    <p className="text-lg font-medium">Drag & drop images here</p>
                    <p className="text-sm text-muted-foreground">
                      or click to select files
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Supports: JPEG, PNG, GIF, WebP (max 10MB each)
                    </p>
                  </div>
                )}
              </div>

              {/* File Rejection Errors */}
              {fileRejections.length > 0 && (
                <div className="mt-4 space-y-2">
                  {fileRejections.map(({ file, errors }) => (
                    <div key={file.name} className="flex items-center space-x-2 text-sm text-destructive">
                      <AlertCircle className="h-4 w-4" />
                      <span>{file.name}: {errors[0]?.message}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* File List */}
          {files.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">
                  Selected Files ({files.length})
                </Label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    files.forEach(file => {
                      if (file.preview) {
                        URL.revokeObjectURL(file.preview);
                      }
                    });
                    setFiles([]);
                  }}
                  disabled={isUploading || isSubmitting}
                >
                  Clear All
                </Button>
              </div>

              <div className="grid gap-4">
                {files.map((file) => (
                  <FilePreviewCard
                    key={file.id}
                    file={file}
                    onRemove={() => removeFile(file.id)}
                    onUpdateProperty={updateFileProperty}
                    disabled={isUploading || isSubmitting}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Upload Progress */}
          {uploadProgress.length > 0 && (
            <div className="space-y-4">
              <Label className="text-base font-semibold">Upload Progress</Label>
              <div className="space-y-3">
                {uploadProgress.map((progress) => (
                  <UploadProgressCard key={progress.file.name} progress={progress} />
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isUploading || isSubmitting}
          >
            {(isUploading || isSubmitting) ? 'Uploading...' : 'Cancel'}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="min-w-24"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Uploading...
              </>
            ) : (
              `Upload ${files.length} File${files.length !== 1 ? 's' : ''}`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface FilePreviewCardProps {
  file: FileWithPreview;
  onRemove: () => void;
  onUpdateProperty: (fileId: string, property: keyof FileWithPreview, value: string) => void;
  disabled: boolean;
}

function FilePreviewCard({ file, onRemove, onUpdateProperty, disabled }: FilePreviewCardProps) {
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4">
        <div className="flex gap-4">
          {/* Image Preview */}
          <div className="flex-shrink-0">
            <div className="w-20 h-20 rounded-lg overflow-hidden bg-muted">
              {file.preview ? (
                <img
                  src={file.preview}
                  alt={file.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <ImageIcon className="h-8 w-8 text-muted-foreground" />
                </div>
              )}
            </div>
          </div>

          {/* File Details */}
          <div className="flex-1 space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-medium truncate max-w-60">{file.name}</p>
                <p className="text-sm text-muted-foreground">
                  {formatFileSize(file.size)}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={onRemove}
                disabled={disabled}
                className="text-destructive hover:text-destructive"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Image Type */}
              <div className="space-y-1">
                <Label className="text-xs">Image Type</Label>
                <Select
                  value={file.imageType}
                  onValueChange={(value) => onUpdateProperty(file.id, 'imageType', value)}
                  disabled={disabled}
                >
                  <SelectTrigger className="h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {IMAGE_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Alt Text */}
              <div className="space-y-1">
                <Label className="text-xs">Description</Label>
                <Input
                  value={file.altText}
                  onChange={(e) => onUpdateProperty(file.id, 'altText', e.target.value)}
                  placeholder="Image description..."
                  disabled={disabled}
                  className="h-8"
                />
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface UploadProgressCardProps {
  progress: any;
}

function UploadProgressCard({ progress }: UploadProgressCardProps) {
  const getStatusIcon = () => {
    switch (progress.status) {
      case 'uploading':
        return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
      case 'complete':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <FileText className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusColor = () => {
    switch (progress.status) {
      case 'uploading':
        return 'bg-blue-500';
      case 'complete':
        return 'bg-green-500';
      case 'error':
        return 'bg-red-500';
      default:
        return 'bg-muted-foreground';
    }
  };

  return (
    <div className="flex items-center space-x-3 p-3 bg-muted/50 rounded-lg">
      {getStatusIcon()}
      <div className="flex-1">
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm font-medium truncate">{progress.file.name}</span>
          <Badge variant={progress.status === 'error' ? 'destructive' : 'outline'}>
            {progress.status}
          </Badge>
        </div>
        {progress.status === 'uploading' && (
          <Progress value={progress.progress} className="h-2" />
        )}
        {progress.status === 'error' && progress.error && (
          <p className="text-xs text-destructive mt-1">{progress.error}</p>
        )}
      </div>
    </div>
  );
}