/**
 * FallbackImage Component
 * Displays default avatars or placeholders when images fail to load
 */

import React, { useState } from 'react';
import { User, Building2, Package, Image as ImageIcon, Camera } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface FallbackImageProps {
  src?: string | null;
  alt: string;
  className?: string;
  fallbackType?: 'user' | 'company' | 'product' | 'generic' | 'photo';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  shape?: 'square' | 'circle';
  showInitials?: boolean;
  initials?: string;
}

const sizeClasses = {
  sm: 'w-8 h-8',
  md: 'w-16 h-16',
  lg: 'w-20 h-20',
  xl: 'w-32 h-32'
};

const iconSizes = {
  sm: 'w-3 h-3',
  md: 'w-6 h-6',
  lg: 'w-8 h-8',
  xl: 'w-12 h-12'
};

const textSizes = {
  sm: 'text-xs',
  md: 'text-sm',
  lg: 'text-base',
  xl: 'text-lg'
};

export function FallbackImage({
  src,
  alt,
  className,
  fallbackType = 'generic',
  size = 'md',
  shape = 'square',
  showInitials = false,
  initials
}: FallbackImageProps) {
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(!!src);

  const handleImageLoad = () => {
    setIsLoading(false);
    setHasError(false);
  };

  const handleImageError = () => {
    setIsLoading(false);
    setHasError(true);
  };

  const getFallbackIcon = () => {
    const iconClass = iconSizes[size];
    
    switch (fallbackType) {
      case 'user':
        return <User className={cn(iconClass, 'text-gray-400')} />;
      case 'company':
        return <Building2 className={cn(iconClass, 'text-gray-400')} />;
      case 'product':
        return <Package className={cn(iconClass, 'text-gray-400')} />;
      case 'photo':
        return <Camera className={cn(iconClass, 'text-gray-400')} />;
      default:
        return <ImageIcon className={cn(iconClass, 'text-gray-400')} />;
    }
  };

  const baseClasses = cn(
    sizeClasses[size],
    shape === 'circle' ? 'rounded-full' : 'rounded-lg',
    'flex items-center justify-center border border-gray-200 bg-gray-50',
    className
  );

  // Show fallback if no src, has error, or should show initials
  const shouldShowFallback = !src || hasError || (showInitials && initials);

  if (shouldShowFallback) {
    return (
      <div className={baseClasses}>
        {showInitials && initials ? (
          <span className={cn('font-medium text-gray-600', textSizes[size])}>
            {initials.toUpperCase()}
          </span>
        ) : (
          getFallbackIcon()
        )}
      </div>
    );
  }

  return (
    <div className={cn('relative', sizeClasses[size])}>
      {isLoading && (
        <div className={cn(baseClasses, 'absolute inset-0 animate-pulse')}>
          {getFallbackIcon()}
        </div>
      )}
      <img
        src={src}
        alt={alt}
        className={cn(
          sizeClasses[size],
          shape === 'circle' ? 'rounded-full' : 'rounded-lg',
          'object-cover border border-gray-200',
          isLoading ? 'opacity-0' : 'opacity-100',
          className
        )}
        onLoad={handleImageLoad}
        onError={handleImageError}
      />
    </div>
  );
}

/**
 * Utility function to generate initials from name
 */
export function getInitials(name?: string): string {
  if (!name) return '';
  
  return name
    .split(' ')
    .map(part => part.charAt(0))
    .join('')
    .substring(0, 2);
}

/**
 * Avatar component specifically for user profiles
 */
export function UserAvatar({
  src,
  name,
  className,
  size = 'md'
}: {
  src?: string | null;
  name?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}) {
  const initials = getInitials(name);
  
  return (
    <FallbackImage
      src={src}
      alt={name || 'User avatar'}
      className={className}
      fallbackType="user"
      size={size}
      shape="circle"
      showInitials={!!initials}
      initials={initials}
    />
  );
}

/**
 * Company logo component
 */
export function CompanyLogo({
  src,
  name,
  className,
  size = 'md'
}: {
  src?: string | null;
  name?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}) {
  return (
    <FallbackImage
      src={src}
      alt={name ? `${name} logo` : 'Company logo'}
      className={className}
      fallbackType="company"
      size={size}
      shape="square"
    />
  );
}

/**
 * Product image component
 */
export function ProductImage({
  src,
  name,
  className,
  size = 'md'
}: {
  src?: string | null;
  name?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}) {
  return (
    <FallbackImage
      src={src}
      alt={name ? `${name} image` : 'Product image'}
      className={className}
      fallbackType="product"
      size={size}
      shape="square"
    />
  );
}