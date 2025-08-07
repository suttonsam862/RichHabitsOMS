import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CompanyLogo } from '@/components/ui/FallbackImage';
import { UserAvatar } from '@/components/ui/UserAvatarComponent';
import { 
  Building2, 
  Phone, 
  Mail, 
  Clock, 
  Package, 
  Star,
  FileImage,
  Award
} from 'lucide-react';

interface ManufacturerCapabilities {
  fabrics?: string[];
  max_order_volume?: number;
  sports?: string[];
  equipment?: string[];
  certifications?: string[];
  lead_time_days?: number;
  specialties?: string[];
  min_order_quantity?: number;
  rush_order_available?: boolean;
  rush_lead_time_days?: number;
  quality_grades?: string[];
  size_ranges?: string[];
  color_capabilities?: string[];
  additional_services?: string[];
}

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

interface Manufacturer {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  company?: string;
  role: string;
  createdAt: string;
  custom_attributes?: {
    notes?: string;
    preferredCategories?: string[];
    pricingTiers?: Array<{
      category: string;
      basePrice: number;
      markup: number;
    }>;
    capabilities?: ManufacturerCapabilities;
    media?: MediaFile[];
  };
}

interface ManufacturerCardProps {
  manufacturer: Manufacturer;
  onSelect?: (manufacturer: Manufacturer) => void;
  onAssign?: (manufacturer: Manufacturer) => void;
  showAssignButton?: boolean;
  showSelectButton?: boolean;
  compact?: boolean;
  className?: string;
}

export default function ManufacturerCard({
  manufacturer,
  onSelect,
  onAssign,
  showAssignButton = false,
  showSelectButton = false,
  compact = false,
  className = ''
}: ManufacturerCardProps) {
  const capabilities = manufacturer.custom_attributes?.capabilities;
  const media = manufacturer.custom_attributes?.media || [];
  const logo = media.find(m => m.type === 'logo');
  const certificates = media.filter(m => m.type === 'certificate');

  const formatNumber = (num?: number) => {
    if (!num) return 'N/A';
    return num.toLocaleString();
  };

  const renderCapabilityBadges = (items: string[] = [], maxShow: number = 3) => {
    if (!items.length) return null;
    
    const showItems = items.slice(0, maxShow);
    const hasMore = items.length > maxShow;
    
    return (
      <div className="flex flex-wrap gap-1">
        {showItems.map((item, index) => (
          <Badge key={index} variant="secondary" className="text-xs">
            {item}
          </Badge>
        ))}
        {hasMore && (
          <Badge variant="outline" className="text-xs">
            +{items.length - maxShow} more
          </Badge>
        )}
      </div>
    );
  };

  if (compact) {
    return (
      <Card className={`hover:shadow-md transition-shadow ${className}`}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <CompanyLogo
                src={logo?.url || ""}
                alt={manufacturer.company || "Company Logo"}
                size="sm"
              />
              <div>
                <h4 className="font-medium">{manufacturer.company || `${manufacturer.firstName} ${manufacturer.lastName}`}</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {capabilities?.lead_time_days ? `${capabilities.lead_time_days} days` : 'Contact for timing'}
                  {capabilities?.max_order_volume && ` • Up to ${formatNumber(capabilities.max_order_volume)} units`}
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              {capabilities?.rush_order_available && (
                <Badge variant="default" className="bg-green-500">Rush</Badge>
              )}
              {certificates.length > 0 && (
                <Badge variant="outline" className="text-xs">
                  <Award className="w-3 h-3 mr-1" />
                  {certificates.length}
                </Badge>
              )}
              {showSelectButton && onSelect && (
                <Button size="sm" onClick={() => onSelect(manufacturer)}>
                  Select
                </Button>
              )}
              {showAssignButton && onAssign && (
                <Button size="sm" onClick={() => onAssign(manufacturer)}>
                  Assign
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`hover:shadow-md transition-shadow ${className}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <CompanyLogo
              src={logo?.url || ""}
              alt={manufacturer.company || "Company Logo"}
              size="md"
            />
            <div>
              <CardTitle className="text-lg">
                {manufacturer.company || `${manufacturer.firstName} ${manufacturer.lastName}`}
              </CardTitle>
              <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400 mt-1">
                {manufacturer.email && (
                  <div className="flex items-center space-x-1">
                    <Mail className="w-4 h-4" />
                    <span>{manufacturer.email}</span>
                  </div>
                )}
                {manufacturer.phone && (
                  <div className="flex items-center space-x-1">
                    <Phone className="w-4 h-4" />
                    <span>{manufacturer.phone}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {capabilities?.rush_order_available && (
              <Badge variant="default" className="bg-green-500">Rush Available</Badge>
            )}
            {certificates.length > 0 && (
              <Badge variant="outline">
                <Award className="w-3 h-3 mr-1" />
                {certificates.length} Cert{certificates.length !== 1 ? 's' : ''}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Key Capabilities */}
        {capabilities && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Clock className="w-4 h-4 text-blue-500" />
                <span className="text-sm font-medium">Lead Time</span>
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Standard: {capabilities.lead_time_days || 'N/A'} days
                {capabilities.rush_order_available && capabilities.rush_lead_time_days && (
                  <span className="block">Rush: {capabilities.rush_lead_time_days} days</span>
                )}
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Package className="w-4 h-4 text-green-500" />
                <span className="text-sm font-medium">Capacity</span>
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Min: {formatNumber(capabilities.min_order_quantity)} units
                <span className="block">Max: {formatNumber(capabilities.max_order_volume)} units</span>
              </div>
            </div>
          </div>
        )}

        {/* Specialties */}
        {capabilities?.specialties && capabilities.specialties.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Star className="w-4 h-4 text-yellow-500" />
              <span className="text-sm font-medium">Specialties</span>
            </div>
            {renderCapabilityBadges(capabilities.specialties, 4)}
          </div>
        )}

        {/* Sports */}
        {capabilities?.sports && capabilities.sports.length > 0 && (
          <div className="space-y-2">
            <span className="text-sm font-medium">Sports</span>
            {renderCapabilityBadges(capabilities.sports, 5)}
          </div>
        )}

        {/* Fabrics */}
        {capabilities?.fabrics && capabilities.fabrics.length > 0 && (
          <div className="space-y-2">
            <span className="text-sm font-medium">Fabrics</span>
            {renderCapabilityBadges(capabilities.fabrics, 4)}
          </div>
        )}

        {/* Equipment */}
        {capabilities?.equipment && capabilities.equipment.length > 0 && (
          <div className="space-y-2">
            <span className="text-sm font-medium">Equipment</span>
            {renderCapabilityBadges(capabilities.equipment, 3)}
          </div>
        )}
        
        {/* Action Buttons */}
        <div className="flex justify-end space-x-2 pt-2 border-t">
          {showSelectButton && onSelect && (
            <Button variant="outline" onClick={() => onSelect(manufacturer)}>
              Select Manufacturer
            </Button>
          )}
          {showAssignButton && onAssign && (
            <Button onClick={() => onAssign(manufacturer)}>
              Assign to Order
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}