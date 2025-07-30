/**
 * REAL-TIME UPLOAD PROGRESS INDICATOR COMPONENT
 * Displays upload progress with real-time updates, speed, and time remaining
 */

import React from 'react';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Upload, 
  CheckCircle, 
  XCircle, 
  X, 
  Clock, 
  Zap,
  FileImage,
  Loader2
} from 'lucide-react';
import { UploadProgress } from '@/hooks/useUploadProgress';
import { cn } from '@/lib/utils';

interface UploadProgressIndicatorProps {
  upload: UploadProgress;
  onCancel?: (id: string) => void;
  onRemove?: (id: string) => void;
  compact?: boolean;
  className?: string;
}

export const UploadProgressIndicator: React.FC<UploadProgressIndicatorProps> = ({
  upload,
  onCancel,
  onRemove,
  compact = false,
  className = ''
}) => {
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatSpeed = (bytesPerSecond: number) => {
    return formatBytes(bytesPerSecond) + '/s';
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

  const getStatusIcon = () => {
    switch (upload.status) {
      case 'uploading':
        return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'cancelled':
        return <X className="h-4 w-4 text-gray-500" />;
      default:
        return <Upload className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusColor = () => {
    switch (upload.status) {
      case 'uploading':
        return 'bg-blue-500';
      case 'completed':
        return 'bg-green-500';
      case 'error':
        return 'bg-red-500';
      case 'cancelled':
        return 'bg-gray-500';
      default:
        return 'bg-gray-400';
    }
  };

  const getStatusBadge = () => {
    switch (upload.status) {
      case 'uploading':
        return <Badge variant="outline" className="text-blue-600 border-blue-200">Uploading</Badge>;
      case 'completed':
        return <Badge variant="outline" className="text-green-600 border-green-200">Complete</Badge>;
      case 'error':
        return <Badge variant="outline" className="text-red-600 border-red-200">Error</Badge>;
      case 'cancelled':
        return <Badge variant="outline" className="text-gray-600 border-gray-200">Cancelled</Badge>;
      default:
        return <Badge variant="outline">Idle</Badge>;
    }
  };

  if (compact) {
    return (
      <div className={cn("flex items-center gap-3 p-2 border rounded-md", className)}>
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <FileImage className="h-4 w-4 text-gray-400 flex-shrink-0" />
          <span className="text-sm font-medium truncate">{upload.filename}</span>
          {getStatusIcon()}
        </div>
        
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">{upload.progress}%</span>
          {upload.status === 'uploading' && onCancel && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onCancel(upload.id)}
              className="h-6 w-6 p-0"
            >
              <X className="h-3 w-3" />
            </Button>
          )}
          {(upload.status === 'completed' || upload.status === 'error' || upload.status === 'cancelled') && onRemove && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onRemove(upload.id)}
              className="h-6 w-6 p-0"
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
        
        <div className="w-20">
          <Progress 
            value={upload.progress} 
            className="h-2"
          />
        </div>
      </div>
    );
  }

  return (
    <Card className={cn("w-full", className)}>
      <CardContent className="p-4 space-y-3">
        {/* Header with filename and status */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <FileImage className="h-4 w-4 text-gray-400 flex-shrink-0" />
            <span className="font-medium truncate">{upload.filename}</span>
          </div>
          <div className="flex items-center gap-2">
            {getStatusBadge()}
            {upload.status === 'uploading' && onCancel && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onCancel(upload.id)}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
            {(upload.status === 'completed' || upload.status === 'error' || upload.status === 'cancelled') && onRemove && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onRemove(upload.id)}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Progress bar */}
        <div className="space-y-2">
          <Progress 
            value={upload.progress} 
            className="h-3"
          />
          <div className="flex items-center justify-between text-sm text-gray-500">
            <span>{upload.progress}% complete</span>
            <span>{formatBytes(upload.uploadedBytes)} / {formatBytes(upload.totalBytes)}</span>
          </div>
        </div>

        {/* Speed and time remaining (only during upload) */}
        {upload.status === 'uploading' && upload.speed > 0 && (
          <div className="flex items-center gap-4 text-sm text-gray-500">
            <div className="flex items-center gap-1">
              <Zap className="h-3 w-3" />
              <span>{formatSpeed(upload.speed)}</span>
            </div>
            {upload.remainingTime > 0 && (
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                <span>{formatTime(upload.remainingTime)} remaining</span>
              </div>
            )}
          </div>
        )}

        {/* Error message */}
        {upload.status === 'error' && upload.error && (
          <div className="text-sm text-red-600 bg-red-50 p-2 rounded-md">
            {upload.error}
          </div>
        )}
      </CardContent>
    </Card>
  );
};