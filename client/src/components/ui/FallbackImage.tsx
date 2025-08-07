/**
 * FALLBACK IMAGE COMPONENT
 * Image component with fallback and error handling
 */

import React, { useState, ImgHTMLAttributes } from 'react';
import { Package } from 'lucide-react';
import { cn } from '@/lib/utils';

// Assuming OptimizedImage is defined elsewhere and imported, or will be defined later.
// For the purpose of this fix, we'll assume it exists or will be added.
// Placeholder for OptimizedImage if it's not provided in the original code snippet.
// If OptimizedImage is meant to be defined here, its definition would be needed.
// For now, we'll use a simple img tag as a placeholder within UserAvatar's logic.

// Mock OptimizedImage for compilation purposes if it's not provided
const OptimizedImage = ({ src, alt, className, style, loading, ...props }) => (
  <img src={src} alt={alt} className={className} style={style} loading={loading} {...props} />
);


interface ProductImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  src: string;
  alt: string;
  fallbackSrc?: string;
  showPlaceholder?: boolean;
}

export function ProductImage({
  src,
  alt,
  fallbackSrc,
  showPlaceholder = true,
  className,
  ...props
}: ProductImageProps) {
  const [imageError, setImageError] = useState(false);
  const [fallbackError, setFallbackError] = useState(false);

  const handleError = () => {
    if (!fallbackError && fallbackSrc) {
      setImageError(true);
    } else {
      setImageError(true);
      setFallbackError(true);
    }
  };

  const handleFallbackError = () => {
    setFallbackError(true);
  };

  // Show placeholder if image failed to load and no fallback or fallback failed
  if ((imageError && !fallbackSrc) || (imageError && fallbackError)) {
    return showPlaceholder ? (
      <div
        className={cn(
          "flex items-center justify-center bg-gray-100 text-gray-400",
          className
        )}
        {...props}
      >
        <Package className="h-8 w-8" />
      </div>
    ) : null;
  }

  // Show fallback image if primary image failed but fallback is available
  if (imageError && fallbackSrc && !fallbackError) {
    return (
      <img
        src={fallbackSrc}
        alt={alt}
        className={className}
        onError={handleFallbackError}
        {...props}
      />
    );
  }

  // Show primary image
  return (
    <img
      src={src}
      alt={alt}
      className={className}
      onError={handleError}
      {...props}
    />
  );
}

// UserAvatar component for user profile images
export const UserAvatar: React.FC<{
  src?: string;
  alt?: string;
  fallbackText?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}> = ({ 
  src, 
  alt = "User", 
  fallbackText = "U", 
  size = 'md', 
  className = "" 
}) => {
  const sizeClasses = {
    sm: 'w-8 h-8 text-sm',
    md: 'w-10 h-10 text-base', 
    lg: 'w-12 h-12 text-lg'
  };

  return (
    <div className={`rounded-full bg-gray-200 flex items-center justify-center ${sizeClasses[size]} ${className}`}>
      {src ? (
        <img 
          src={src} 
          alt={alt}
          className="w-full h-full rounded-full object-cover"
          onError={(e) => {
            e.currentTarget.style.display = 'none';
          }}
        />
      ) : (
        <span className="font-medium text-gray-600">
          {fallbackText.charAt(0).toUpperCase()}
        </span>
      )}
    </div>
  );
};

// CompanyLogo component for company/organization images
interface CompanyLogoProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  src: string;
  alt: string;
  size?: 'sm' | 'md' | 'lg';
  fallbackSrc?: string;
}

export function CompanyLogo({
  src,
  alt,
  size = 'md',
  fallbackSrc,
  className,
  ...props
}: CompanyLogoProps) {
  const [imageError, setImageError] = useState(false);

  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16'
  };

  const handleError = () => {
    setImageError(true);
  };

  if (imageError && !fallbackSrc) {
    return (
      <div
        className={cn(
          "flex items-center justify-center bg-gray-100 text-gray-400 rounded-lg",
          sizeClasses[size],
          className
        )}
        {...props}
      >
        <Package className="h-4 w-4" />
      </div>
    );
  }

  return (
    <img
      src={imageError && fallbackSrc ? fallbackSrc : src}
      alt={alt}
      className={cn(
        "rounded-lg object-cover",
        sizeClasses[size],
        className
      )}
      onError={handleError}
      {...props}
    />
  );
}