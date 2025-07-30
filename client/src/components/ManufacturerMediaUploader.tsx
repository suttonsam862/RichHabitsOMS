import React, { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Upload, 
  FileImage, 
  FileText, 
  File, 
  Trash2, 
  Eye, 
  Download,
  AlertCircle,
  CheckCircle,
  X
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';

interface MediaFile {
  id: string;
  type: 'logo' | 'branding' | 'document' | 'certificate';
  fileName: string;
  url: string;
  fileSize: number;
  mimeType: string;
  description: string;
  uploadedAt: string;
}

interface ManufacturerMediaUploaderProps {
  manufacturerId: string;
  className?: string;
}

const MEDIA_TYPES = [
  { value: 'logo', label: 'Company Logo', icon: FileImage },
  { value: 'branding', label: 'Branding Materials', icon: FileImage },
  { value: 'document', label: 'Company Documents', icon: FileText },
  { value: 'certificate', label: 'Certifications', icon: File }
];

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const getFileIcon = (mimeType: string) => {
  if (mimeType.startsWith('image/')) return FileImage;
  if (mimeType === 'application/pdf') return FileText;
  return File;
};

export default function ManufacturerMediaUploader({ manufacturerId, className = '' }: ManufacturerMediaUploaderProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [uploadType, setUploadType] = useState<string>('logo');
  const [uploadDescription, setUploadDescription] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  // Fetch existing media files
  const { data: mediaFiles = [], isLoading, refetch } = useQuery<MediaFile[]>({
    queryKey: [`/api/manufacturing/manufacturers/${manufacturerId}/media`],
    enabled: !!manufacturerId
  });

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: async ({ file, type, description }: { file: File; type: string; description: string }) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', type);
      formData.append('description', description);

      const response = await fetch(`/api/manufacturing/manufacturers/${manufacturerId}/media`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: formData
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Upload failed');
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Upload successful',
        description: 'Media file has been uploaded successfully'
      });
      refetch();
      setUploadDescription('');
    },
    onError: (error: any) => {
      toast({
        title: 'Upload failed',
        description: error.message,
        variant: 'destructive'
      });
    },
    onSettled: () => {
      setIsUploading(false);
    }
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (mediaId: string) => {
      const response = await fetch(`/api/manufacturing/manufacturers/${manufacturerId}/media/${mediaId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Delete failed');
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'File deleted',
        description: 'Media file has been deleted successfully'
      });
      refetch();
    },
    onError: (error: any) => {
      toast({
        title: 'Delete failed',
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!uploadType) {
      toast({
        title: 'Media type required',
        description: 'Please select a media type before uploading',
        variant: 'destructive'
      });
      return;
    }

    // Validate file size
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: 'File too large',
        description: 'File size must be less than 10MB',
        variant: 'destructive'
      });
      return;
    }

    setIsUploading(true);
    uploadMutation.mutate({
      file,
      type: uploadType,
      description: uploadDescription
    });
  };

  const handleDelete = (mediaId: string) => {
    if (window.confirm('Are you sure you want to delete this file?')) {
      deleteMutation.mutate(mediaId);
    }
  };

  const handleView = (url: string) => {
    window.open(url, '_blank');
  };

  // Group files by type
  const groupedFiles = mediaFiles.reduce((acc, file) => {
    if (!acc[file.type]) acc[file.type] = [];
    acc[file.type].push(file);
    return acc;
  }, {} as Record<string, MediaFile[]>);

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Media Files</CardTitle>
          <CardDescription>Loading media files...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Upload Media Files
          </CardTitle>
          <CardDescription>
            Upload logos, branding materials, documents, and certifications
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Media Type Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="media-type">Media Type</Label>
              <Select value={uploadType} onValueChange={setUploadType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select media type" />
                </SelectTrigger>
                <SelectContent>
                  {MEDIA_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      <div className="flex items-center gap-2">
                        <type.icon className="w-4 h-4" />
                        {type.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={uploadDescription}
                onChange={(e) => setUploadDescription(e.target.value)}
                placeholder="Optional description"
              />
            </div>
          </div>

          {/* File Upload */}
          <div className="border-2 border-dashed rounded-lg p-8 text-center">
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileSelect}
              accept="image/*,.pdf,.doc,.docx,.txt"
              className="hidden"
              disabled={isUploading}
            />
            <Upload className="w-8 h-8 mx-auto mb-4 text-gray-400" />
            <div>
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="mb-2"
              >
                Select Files
              </Button>
              <p className="text-sm text-gray-500 mb-1">
                Images (JPG, PNG, WebP, SVG), Documents (PDF, DOC, DOCX, TXT)
              </p>
              <p className="text-sm text-gray-500">Maximum file size: 10MB</p>
            </div>
          </div>

          {isUploading && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Uploading file... Please wait.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Existing Files */}
      <div className="space-y-4">
        {MEDIA_TYPES.map((mediaType) => {
          const files = groupedFiles[mediaType.value] || [];
          if (files.length === 0) return null;

          return (
            <Card key={mediaType.value}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <mediaType.icon className="w-5 h-5" />
                  {mediaType.label}
                  <Badge variant="secondary">{files.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {files.map((file) => {
                    const FileIcon = getFileIcon(file.mimeType);
                    return (
                      <Card key={file.id} className="overflow-hidden">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-3">
                            <FileIcon className="w-8 h-8 text-blue-500 flex-shrink-0" />
                            <div className="flex gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleView(file.url)}
                                className="h-8 w-8 p-0"
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleDelete(file.id)}
                                className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                                disabled={deleteMutation.isPending}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                          
                          <div className="space-y-2">
                            <h4 className="font-medium text-sm truncate" title={file.fileName}>
                              {file.fileName}
                            </h4>
                            
                            {file.description && (
                              <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2">
                                {file.description}
                              </p>
                            )}
                            
                            <div className="flex items-center justify-between text-xs text-gray-500">
                              <span>{formatFileSize(file.fileSize)}</span>
                              <span>{new Date(file.uploadedAt).toLocaleDateString()}</span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {mediaFiles.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center">
            <FileImage className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <p className="text-gray-600 dark:text-gray-400 mb-2">No media files uploaded yet</p>
            <p className="text-sm text-gray-500">Upload logos, branding materials, and documents above</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}