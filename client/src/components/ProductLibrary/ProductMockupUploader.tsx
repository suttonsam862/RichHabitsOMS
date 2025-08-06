/**
 * PRODUCT MOCKUP UPLOADER COMPONENT
 * Unified interface for uploading mockups to the ProductLibrary system
 * Integrates with the enhanced useProductMockups hook
 */

import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useDropzone } from 'react-dropzone';
import { 
  Upload, 
  X, 
  Image as ImageIcon, 
  FileImage, 
  Clock,
  CheckCircle,
  AlertCircle,
  Trash2
} from 'lucide-react';
import { useProductMockups } from '@/hooks/useProductMockups';
import { cn } from '@/lib/utils';
import { ProductImage } from '@/components/ui/FallbackImage';

interface ProductMockupUploaderProps {
  productId: string;
  onUploadSuccess?: (mockup: any) => void;
  className?: string;
  maxFiles?: number;
}

const MOCKUP_TYPES = [
  { value: 'mockup', label: 'Product Mockup' },
  { value: 'product_photo', label: 'Product Photo' },
  { value: 'design_proof', label: 'Design Proof' },
  { value: 'size_chart', label: 'Size Chart' },
  { value: 'color_reference', label: 'Color Reference' },
  { value: 'technical_drawing', label: 'Technical Drawing' },
];

export function ProductMockupUploader({ 
  productId, 
  onUploadSuccess, 
  className = '',
  maxFiles = 5 
}: ProductMockupUploaderProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadData, setUploadData] = useState({
    image_type: 'mockup',
    alt_text: '',
    notes: ''
  });

  const {
    mockups,
    isLoading,
    uploadMockup,
    isUploading,
    uploads,
    currentUpload,
    cancelUpload,
    deleteMockup,
    isDeleting,
    refetchMockups
  } = useProductMockups(productId, {
    maxSizeMB: 10,
    enableCompression: true
  });

  // Handle file drop and selection
  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles = acceptedFiles.slice(0, maxFiles - selectedFiles.length);
    setSelectedFiles(prev => [...prev, ...newFiles]);
  }, [selectedFiles, maxFiles]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.webp']
    },
    maxSize: 10 * 1024 * 1024, // 10MB
    multiple: true
  });

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return;

    for (const file of selectedFiles) {
      try {
        await uploadMockup({
          file,
          data: {
            ...uploadData,
            alt_text: uploadData.alt_text || `${uploadData.image_type} for product`,
            metadata: JSON.stringify({
              upload_batch_id: Date.now(),
              user_agent: navigator.userAgent
            })
          }
        });
      } catch (error) {
        console.error('Upload failed for file:', file.name, error);
      }
    }

    // Clear form after successful upload
    setSelectedFiles([]);
    setUploadData({
      image_type: 'mockup',
      alt_text: '',
      notes: ''
    });

    if (onUploadSuccess) {
      onUploadSuccess(mockups[0]);
    }

    // Close dialog after upload
    setIsDialogOpen(false);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className={cn('space-y-4', className)}>
      {/* Upload Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" className="w-full">
            <Upload className="mr-2 h-4 w-4" />
            Upload Mockups
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Upload Product Mockups</DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Upload Options */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="mockup-type">Mockup Type</Label>
                <Select
                  value={uploadData.image_type}
                  onValueChange={(value) => setUploadData(prev => ({ ...prev, image_type: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MOCKUP_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="alt-text">Alt Text</Label>
                <Input
                  id="alt-text"
                  value={uploadData.alt_text}
                  onChange={(e) => setUploadData(prev => ({ ...prev, alt_text: e.target.value }))}
                  placeholder="Describe the image..."
                />
              </div>
            </div>

            <div>
              <Label htmlFor="notes">Designer Notes</Label>
              <Textarea
                id="notes"
                value={uploadData.notes}
                onChange={(e) => setUploadData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Add any notes about this mockup..."
                rows={3}
              />
            </div>

            {/* File Upload Area */}
            <Card>
              <CardContent className="p-6">
                <div
                  {...getRootProps()}
                  className={cn(
                    'border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors',
                    isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
                  )}
                >
                  <input {...getInputProps()} />
                  <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  {isDragActive ? (
                    <p className="text-blue-600">Drop the files here...</p>
                  ) : (
                    <div>
                      <p className="text-gray-600 mb-2">
                        Drag & drop images here, or click to select
                      </p>
                      <p className="text-sm text-gray-500">
                        Maximum {maxFiles} files, up to 10MB each
                      </p>
                    </div>
                  )}
                </div>

                {/* Selected Files */}
                {selectedFiles.length > 0 && (
                  <div className="mt-4 space-y-2">
                    <h4 className="font-medium">Selected Files ({selectedFiles.length})</h4>
                    {selectedFiles.map((file, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <FileImage className="h-5 w-5 text-gray-500" />
                          <div>
                            <p className="text-sm font-medium">{file.name}</p>
                            <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFile(index)}
                          disabled={isUploading}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Upload Progress */}
            {currentUpload && (
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Uploading {currentUpload.filename}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => cancelUpload(currentUpload.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <Progress value={currentUpload.progress} className="mb-2" />
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>{formatFileSize(currentUpload.uploadedBytes)} / {formatFileSize(currentUpload.totalBytes)}</span>
                    <span>{Math.round(currentUpload.speed / 1024)} KB/s</span>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Actions */}
            <div className="flex justify-end space-x-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
                disabled={isUploading}
              >
                Cancel
              </Button>
              <Button
                onClick={handleUpload}
                disabled={selectedFiles.length === 0 || isUploading}
              >
                {isUploading ? 'Uploading...' : `Upload ${selectedFiles.length} File${selectedFiles.length !== 1 ? 's' : ''}`}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Existing Mockups Display */}
      {mockups.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Existing Mockups ({mockups.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {mockups.map((mockup) => (
                <div key={mockup.id} className="relative group">
                  <div className="aspect-square relative overflow-hidden rounded-lg border">
                    <ProductImage
                      src={mockup.image_url}
                      alt={mockup.alt_text}
                      className="object-cover w-full h-full"
                    />
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all">
                      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => deleteMockup(mockup.id)}
                          disabled={isDeleting}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-2 space-y-1">
                    <Badge variant="secondary" className="text-xs">
                      {MOCKUP_TYPES.find(t => t.value === mockup.image_type)?.label || mockup.image_type}
                    </Badge>
                    <p className="text-xs text-gray-500 truncate">{mockup.alt_text}</p>
                    {mockup.designer && (
                      <p className="text-xs text-gray-400">
                        by {mockup.designer.first_name} {mockup.designer.last_name}
                      </p>
                    )}
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