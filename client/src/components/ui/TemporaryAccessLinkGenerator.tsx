/**
 * TEMPORARY ACCESS LINK GENERATOR COMPONENT
 * Generates secure temporary access links for private images
 */

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Copy, Download, Clock, ExternalLink, Eye, Shield } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface TemporaryAccessLink {
  imageId: string;
  filename?: string;
  signedUrl: string;
  expiresAt: string;
  image_purpose?: string;
  error?: string;
}

interface TemporaryAccessLinkGeneratorProps {
  entityType?: 'catalog_item' | 'order' | 'design_task' | 'customer' | 'manufacturer' | 'user_profile' | 'organization';
  entityId?: string;
  className?: string;
}

export const TemporaryAccessLinkGenerator: React.FC<TemporaryAccessLinkGeneratorProps> = ({
  entityType,
  entityId,
  className = ''
}) => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [accessLinks, setAccessLinks] = useState<TemporaryAccessLink[]>([]);
  const [singleImageId, setSingleImageId] = useState('');
  const [multipleImageIds, setMultipleImageIds] = useState('');
  const [expiresInHours, setExpiresInHours] = useState('1');
  const [imagePurpose, setImagePurpose] = useState<string>('');

  const expirationOptions = [
    { value: '1', label: '1 Hour' },
    { value: '2', label: '2 Hours' },
    { value: '6', label: '6 Hours' },
    { value: '12', label: '12 Hours' },
    { value: '24', label: '24 Hours' }
  ];

  const purposeOptions = [
    { value: '', label: 'All Purposes' },
    { value: 'gallery', label: 'Gallery Images' },
    { value: 'profile', label: 'Profile Images' },
    { value: 'production', label: 'Production Images' },
    { value: 'design', label: 'Design Files' },
    { value: 'logo', label: 'Logo Images' },
    { value: 'thumbnail', label: 'Thumbnails' },
    { value: 'hero', label: 'Hero Images' },
    { value: 'attachment', label: 'Attachments' }
  ];

  const generateSingleAccessLink = async () => {
    if (!singleImageId.trim()) {
      toast({
        title: "Missing Image ID",
        description: "Please enter an image ID",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/images/access/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify({
          imageId: singleImageId.trim(),
          expiresInSeconds: parseInt(expiresInHours) * 3600
        })
      });

      const data = await response.json();
      if (data.success) {
        setAccessLinks([{
          imageId: data.data.imageId,
          signedUrl: data.data.signedUrl,
          expiresAt: data.data.expiresAt
        }]);
        toast({
          title: "Access Link Generated",
          description: `Temporary link expires in ${expiresInHours} hour(s)`
        });
      } else {
        throw new Error(data.message);
      }
    } catch (error: any) {
      console.error('Failed to generate access link:', error);
      toast({
        title: "Generation Failed",
        description: error.message || "Failed to generate temporary access link",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const generateBulkAccessLinks = async () => {
    const imageIds = multipleImageIds.split('\n')
      .map(id => id.trim())
      .filter(id => id.length > 0);

    if (imageIds.length === 0) {
      toast({
        title: "Missing Image IDs",
        description: "Please enter one or more image IDs (one per line)",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/images/access/bulk-generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify({
          imageIds,
          expiresInSeconds: parseInt(expiresInHours) * 3600
        })
      });

      const data = await response.json();
      if (data.success) {
        setAccessLinks(data.data.results);
        toast({
          title: "Bulk Links Generated",
          description: `Generated ${data.data.summary.successful} of ${data.data.summary.total} links`
        });
      } else {
        throw new Error(data.message);
      }
    } catch (error: any) {
      console.error('Failed to generate bulk access links:', error);
      toast({
        title: "Generation Failed",
        description: error.message || "Failed to generate bulk access links",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const generateEntityAccessLinks = async () => {
    if (!entityType || !entityId) {
      toast({
        title: "Missing Entity Information",
        description: "Entity type and ID are required",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/images/access/entity-generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify({
          entityType,
          entityId,
          imagePurpose: imagePurpose || undefined,
          expiresInSeconds: parseInt(expiresInHours) * 3600
        })
      });

      const data = await response.json();
      if (data.success) {
        setAccessLinks(data.data.results);
        toast({
          title: "Entity Links Generated",
          description: `Generated ${data.data.summary.successful} links for ${entityType}`
        });
      } else {
        throw new Error(data.message);
      }
    } catch (error: any) {
      console.error('Failed to generate entity access links:', error);
      toast({
        title: "Generation Failed",
        description: error.message || "Failed to generate entity access links",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Copied to Clipboard",
        description: "Access link copied successfully"
      });
    } catch (error) {
      toast({
        title: "Copy Failed",
        description: "Failed to copy to clipboard",
        variant: "destructive"
      });
    }
  };

  const formatExpiryTime = (expiresAt: string) => {
    const expiryDate = new Date(expiresAt);
    const now = new Date();
    const diffMs = expiryDate.getTime() - now.getTime();
    const diffHours = Math.round(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.round(diffMs / (1000 * 60));

    if (diffHours >= 1) {
      return `${diffHours}h`;
    } else if (diffMinutes > 0) {
      return `${diffMinutes}m`;
    } else {
      return 'Expired';
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Temporary Access Link Generator
        </CardTitle>
        <CardDescription>
          Generate secure temporary links for private images with configurable expiration times
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Expiration Time Control */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="expiry">Link Expiration</Label>
              <Select value={expiresInHours} onValueChange={setExpiresInHours}>
                <SelectTrigger>
                  <SelectValue placeholder="Select expiration time" />
                </SelectTrigger>
                <SelectContent>
                  {expirationOptions.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {entityType && (
              <div>
                <Label htmlFor="purpose">Image Purpose</Label>
                <Select value={imagePurpose} onValueChange={setImagePurpose}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select purpose" />
                  </SelectTrigger>
                  <SelectContent>
                    {purposeOptions.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <Tabs defaultValue={entityType ? "entity" : "single"} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="single">Single Image</TabsTrigger>
              <TabsTrigger value="bulk">Bulk Images</TabsTrigger>
              {entityType && <TabsTrigger value="entity">Entity Images</TabsTrigger>}
            </TabsList>
            
            <TabsContent value="single" className="space-y-4">
              <div>
                <Label htmlFor="singleImageId">Image ID</Label>
                <Input
                  id="singleImageId"
                  value={singleImageId}
                  onChange={(e) => setSingleImageId(e.target.value)}
                  placeholder="Enter image UUID"
                />
              </div>
              <Button 
                onClick={generateSingleAccessLink} 
                disabled={isLoading}
                className="w-full"
              >
                <Eye className="h-4 w-4 mr-2" />
                Generate Access Link
              </Button>
            </TabsContent>

            <TabsContent value="bulk" className="space-y-4">
              <div>
                <Label htmlFor="multipleImageIds">Image IDs (one per line)</Label>
                <textarea
                  id="multipleImageIds"
                  value={multipleImageIds}
                  onChange={(e) => setMultipleImageIds(e.target.value)}
                  placeholder="Enter image UUIDs, one per line"
                  className="w-full h-32 p-2 border border-input rounded-md"
                />
              </div>
              <Button 
                onClick={generateBulkAccessLinks} 
                disabled={isLoading}
                className="w-full"
              >
                <Eye className="h-4 w-4 mr-2" />
                Generate Bulk Access Links
              </Button>
            </TabsContent>

            {entityType && (
              <TabsContent value="entity" className="space-y-4">
                <div className="bg-muted p-3 rounded-md">
                  <p className="text-sm text-muted-foreground">
                    Entity: <span className="font-medium">{entityType}</span> - <span className="font-mono text-xs">{entityId}</span>
                  </p>
                </div>
                <Button 
                  onClick={generateEntityAccessLinks} 
                  disabled={isLoading}
                  className="w-full"
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Generate Entity Access Links
                </Button>
              </TabsContent>
            )}
          </Tabs>

          {/* Generated Links Display */}
          {accessLinks.length > 0 && (
            <div className="mt-6 space-y-3">
              <h3 className="text-lg font-semibold">Generated Access Links</h3>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {accessLinks.map((link, index) => (
                  <Card key={index} className="p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium">
                            {link.filename || `Image ${link.imageId.slice(0, 8)}`}
                          </span>
                          {link.image_purpose && (
                            <Badge variant="secondary" className="text-xs">
                              {link.image_purpose}
                            </Badge>
                          )}
                          <Badge variant="outline" className="text-xs">
                            <Clock className="h-3 w-3 mr-1" />
                            {formatExpiryTime(link.expiresAt)}
                          </Badge>
                        </div>
                        {link.error ? (
                          <p className="text-sm text-destructive">{link.error}</p>
                        ) : (
                          <p className="text-xs text-muted-foreground truncate">
                            {link.signedUrl}
                          </p>
                        )}
                      </div>
                      {!link.error && (
                        <div className="flex gap-1 ml-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => copyToClipboard(link.signedUrl)}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => window.open(link.signedUrl, '_blank')}
                          >
                            <ExternalLink className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};