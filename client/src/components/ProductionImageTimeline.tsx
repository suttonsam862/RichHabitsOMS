import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  Clock, 
  Image as ImageIcon, 
  Calendar, 
  Eye, 
  Filter,
  ChevronDown,
  ChevronUp,
  Activity
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

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

interface ProductionImageTimelineProps {
  orderId: string;
  className?: string;
}

const PRODUCTION_STAGES = [
  { value: '', label: 'All Stages' },
  { value: 'cutting', label: 'Cutting' },
  { value: 'sewing', label: 'Sewing' },
  { value: 'assembly', label: 'Assembly' },
  { value: 'quality_check', label: 'Quality Check' },
  { value: 'packaging', label: 'Packaging' },
  { value: 'completed', label: 'Completed' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'review', label: 'Review' }
];

const STAGE_COLORS = {
  cutting: 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-300',
  sewing: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300',
  assembly: 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-300',
  quality_check: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300',
  packaging: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300',
  completed: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300',
  in_progress: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/20 dark:text-cyan-300',
  review: 'bg-pink-100 text-pink-800 dark:bg-pink-900/20 dark:text-pink-300'
};

export function ProductionImageTimeline({ orderId, className = '' }: ProductionImageTimelineProps) {
  const [selectedStage, setSelectedStage] = useState('');
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set());

  const { data: imagesData, isLoading, error } = useQuery({
    queryKey: ['production-images', orderId, selectedStage],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedStage) params.append('stage', selectedStage);
      
      const response = await fetch(`/api/orders/${orderId}/images/production?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch production images');
      }

      return response.json();
    }
  });

  const images: ProductionImage[] = imagesData?.images || [];

  // Group images by date
  const imagesByDate = images.reduce((groups, image) => {
    const date = new Date(image.uploadedAt).toDateString();
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(image);
    return groups;
  }, {} as Record<string, ProductionImage[]>);

  // Sort dates (newest first)
  const sortedDates = Object.keys(imagesByDate).sort((a, b) => 
    new Date(b).getTime() - new Date(a).getTime()
  );

  const toggleDayExpansion = (date: string) => {
    const newExpanded = new Set(expandedDays);
    if (newExpanded.has(date)) {
      newExpanded.delete(date);
    } else {
      newExpanded.add(date);
    }
    setExpandedDays(newExpanded);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    }
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Production Timeline
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Production Timeline
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            Failed to load production timeline
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Production Timeline
          <Badge variant="outline" className="ml-auto">
            {images.length} image{images.length !== 1 ? 's' : ''}
          </Badge>
        </CardTitle>
        
        {/* Stage Filter */}
        <div className="flex items-center gap-2 pt-2">
          <Filter className="h-4 w-4 text-gray-500" />
          <Select value={selectedStage} onValueChange={setSelectedStage}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by stage" />
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
      </CardHeader>

      <CardContent>
        {sortedDates.length === 0 ? (
          <div className="text-center py-8">
            <ImageIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No production images found</p>
            <p className="text-sm text-gray-400 mt-2">
              Images will appear here as they are uploaded during production
            </p>
          </div>
        ) : (
          <ScrollArea className="h-96">
            <div className="space-y-6">
              {sortedDates.map((date, dateIndex) => {
                const dayImages = imagesByDate[date];
                const isExpanded = expandedDays.has(date);
                const visibleImages = isExpanded ? dayImages : dayImages.slice(0, 3);
                const hasMore = dayImages.length > 3;

                return (
                  <div key={date} className="relative">
                    {/* Timeline connector */}
                    {dateIndex < sortedDates.length - 1 && (
                      <div className="absolute left-6 top-16 w-0.5 h-full bg-gray-200 dark:bg-gray-700" />
                    )}

                    {/* Date Header */}
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-3 h-3 rounded-full bg-blue-600 z-10" />
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-gray-500" />
                        <h3 className="font-medium text-gray-900 dark:text-gray-100">
                          {formatDate(date)}
                        </h3>
                        <Badge variant="outline" className="text-xs">
                          {dayImages.length} image{dayImages.length !== 1 ? 's' : ''}
                        </Badge>
                      </div>
                    </div>

                    {/* Images for this date */}
                    <div className="ml-6 space-y-3">
                      {visibleImages.map((image, imageIndex) => (
                        <div key={image.id} className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                          {/* Image thumbnail */}
                          <div className="w-16 h-16 bg-gray-200 dark:bg-gray-700 rounded-lg overflow-hidden flex-shrink-0">
                            <img
                              src={image.url}
                              alt={image.caption}
                              className="w-full h-full object-cover"
                              loading="lazy"
                            />
                          </div>

                          {/* Image details */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                                  {image.caption}
                                </p>
                                <p className="text-xs text-gray-500 truncate">
                                  {image.originalName}
                                </p>
                              </div>
                              
                              <div className="flex items-center gap-2 flex-shrink-0">
                                <Badge 
                                  className={`text-xs ${STAGE_COLORS[image.stage as keyof typeof STAGE_COLORS] || 'bg-gray-100 text-gray-800'}`}
                                >
                                  {PRODUCTION_STAGES.find(s => s.value === image.stage)?.label || image.stage}
                                </Badge>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => window.open(image.url, '_blank')}
                                  className="p-1 h-6 w-6"
                                >
                                  <Eye className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>

                            <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                              <div className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {formatTime(image.uploadedAt)}
                              </div>
                              <span>{formatFileSize(image.size)}</span>
                              {image.taskType && (
                                <Badge variant="outline" className="text-xs px-1 py-0">
                                  {image.taskType}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}

                      {/* Show more/less button */}
                      {hasMore && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleDayExpansion(date)}
                          className="w-full justify-center text-blue-600 hover:text-blue-700"
                        >
                          {isExpanded ? (
                            <>
                              <ChevronUp className="h-4 w-4 mr-1" />
                              Show Less
                            </>
                          ) : (
                            <>
                              <ChevronDown className="h-4 w-4 mr-1" />
                              Show {dayImages.length - 3} More
                            </>
                          )}
                        </Button>
                      )}
                    </div>

                    {dateIndex < sortedDates.length - 1 && (
                      <Separator className="mt-6" />
                    )}
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}