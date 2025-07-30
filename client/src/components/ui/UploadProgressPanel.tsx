/**
 * UPLOAD PROGRESS PANEL COMPONENT
 * Displays multiple upload progress indicators in a collapsible panel
 */

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  ChevronUp, 
  ChevronDown, 
  Upload, 
  CheckCircle, 
  XCircle, 
  Trash2,
  X
} from 'lucide-react';
import { UploadProgressIndicator } from './UploadProgressIndicator';
import { UploadProgress } from '@/hooks/useUploadProgress';
import { cn } from '@/lib/utils';

interface UploadProgressPanelProps {
  uploads: UploadProgress[];
  onCancel?: (id: string) => void;
  onRemove?: (id: string) => void;
  onClearCompleted?: () => void;
  onClearAll?: () => void;
  className?: string;
  defaultOpen?: boolean;
  compact?: boolean;
}

export const UploadProgressPanel: React.FC<UploadProgressPanelProps> = ({
  uploads,
  onCancel,
  onRemove,
  onClearCompleted,
  onClearAll,
  className = '',
  defaultOpen = true,
  compact = false
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  if (uploads.length === 0) {
    return null;
  }

  const activeUploads = uploads.filter(upload => upload.status === 'uploading');
  const completedUploads = uploads.filter(upload => upload.status === 'completed');
  const erroredUploads = uploads.filter(upload => upload.status === 'error');
  const cancelledUploads = uploads.filter(upload => upload.status === 'cancelled');

  const totalProgress = uploads.length > 0 
    ? Math.round(uploads.reduce((sum, upload) => sum + upload.progress, 0) / uploads.length)
    : 0;

  const getStatusCounts = () => {
    return {
      active: activeUploads.length,
      completed: completedUploads.length,
      errored: erroredUploads.length,
      cancelled: cancelledUploads.length
    };
  };

  const statusCounts = getStatusCounts();

  return (
    <Card className={cn("w-full", className)}>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Upload className="h-5 w-5 text-blue-500" />
                <CardTitle className="text-lg">
                  Upload Progress ({uploads.length})
                </CardTitle>
                {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </div>
              
              <div className="flex items-center gap-2">
                {statusCounts.active > 0 && (
                  <Badge variant="outline" className="text-blue-600 border-blue-200">
                    {statusCounts.active} uploading
                  </Badge>
                )}
                {statusCounts.completed > 0 && (
                  <Badge variant="outline" className="text-green-600 border-green-200">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    {statusCounts.completed}
                  </Badge>
                )}
                {statusCounts.errored > 0 && (
                  <Badge variant="outline" className="text-red-600 border-red-200">
                    <XCircle className="h-3 w-3 mr-1" />
                    {statusCounts.errored}
                  </Badge>
                )}
                {!isOpen && statusCounts.active > 0 && (
                  <div className="text-sm text-gray-500">
                    {totalProgress}%
                  </div>
                )}
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <CardContent className="pt-0 space-y-3">
            {/* Action buttons */}
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-500">
                {statusCounts.active > 0 && `${statusCounts.active} active upload${statusCounts.active !== 1 ? 's' : ''}`}
                {statusCounts.active === 0 && uploads.length > 0 && 'All uploads finished'}
              </div>
              
              <div className="flex items-center gap-2">
                {(statusCounts.completed > 0 || statusCounts.errored > 0 || statusCounts.cancelled > 0) && onClearCompleted && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onClearCompleted}
                    className="text-gray-600"
                  >
                    <Trash2 className="h-3 w-3 mr-1" />
                    Clear Finished
                  </Button>
                )}
                {uploads.length > 0 && onClearAll && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onClearAll}
                    className="text-red-600 hover:text-red-700"
                  >
                    <X className="h-3 w-3 mr-1" />
                    Clear All
                  </Button>
                )}
              </div>
            </div>

            {/* Upload list */}
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {uploads.map((upload) => (
                <UploadProgressIndicator
                  key={upload.id}
                  upload={upload}
                  onCancel={onCancel}
                  onRemove={onRemove}
                  compact={compact}
                />
              ))}
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};