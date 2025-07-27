import React, { useState, useRef, useEffect } from 'react';
import { Loader2, ImageIcon } from 'lucide-react';

interface OptimizedImageProps {
  src?: string;
  alt: string;
  className?: string;
  width?: number;
  height?: number;
  loading?: 'lazy' | 'eager';
  quality?: number;
  placeholder?: 'blur' | 'empty';
  fallback?: string;
  sizes?: string;
  onLoad?: () => void;
  onError?: () => void;
}

/**
 * High-performance image component with lazy loading, optimization, and progressive enhancement
 */
export default function OptimizedImage({
  src,
  alt,
  className = '',
  width,
  height,
  loading = 'lazy',
  quality = 85,
  placeholder = 'blur',
  fallback,
  sizes = '(max-width: 768px) 100vw, 400px',
  onLoad,
  onError
}: OptimizedImageProps) {
  const [imageState, setImageState] = useState<'loading' | 'loaded' | 'error'>('loading');
  const [isIntersecting, setIsIntersecting] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const placeholderRef = useRef<HTMLDivElement>(null);

  // Intersection Observer for lazy loading
  useEffect(() => {
    if (loading === 'eager') {
      setIsIntersecting(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsIntersecting(true);
          observer.disconnect();
        }
      },
      {
        rootMargin: '50px' // Start loading 50px before image comes into view
      }
    );

    if (placeholderRef.current) {
      observer.observe(placeholderRef.current);
    }

    return () => observer.disconnect();
  }, [loading]);

  // Generate responsive image URLs
  const generateSrcSet = (baseSrc: string): string => {
    if (!baseSrc) return '';
    
    // Extract base URL pattern
    const urlParts = baseSrc.split('/');
    const filename = urlParts[urlParts.length - 1];
    const basePath = urlParts.slice(0, -1).join('/');
    
    // Generate different sizes based on filename pattern
    if (filename.includes('-medium.webp')) {
      const thumbnailUrl = baseSrc.replace('-medium.webp', '-thumbnail.webp');
      const largeUrl = baseSrc.replace('-medium.webp', '-large.webp');
      
      return [
        `${thumbnailUrl} 150w`,
        `${baseSrc} 400w`,
        `${largeUrl} 800w`
      ].join(', ');
    }
    
    // Fallback to single source
    return `${baseSrc} 400w`;
  };

  const handleImageLoad = () => {
    setImageState('loaded');
    onLoad?.();
  };

  const handleImageError = () => {
    setImageState('error');
    onError?.();
  };

  // Blur placeholder for progressive loading
  const BlurPlaceholder = () => (
    <div
      className={`absolute inset-0 bg-gradient-to-br from-gray-100 to-gray-200 animate-pulse ${
        imageState === 'loaded' ? 'opacity-0' : 'opacity-100'
      } transition-opacity duration-300`}
    >
      <div className="flex items-center justify-center h-full">
        {imageState === 'loading' ? (
          <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
        ) : imageState === 'error' ? (
          <ImageIcon className="w-6 h-6 text-gray-400" />
        ) : null}
      </div>
    </div>
  );

  // Error fallback component
  const ErrorFallback = () => (
    <div className={`flex items-center justify-center bg-gray-100 ${className}`}>
      <div className="text-center p-4">
        <ImageIcon className="w-8 h-8 text-gray-400 mx-auto mb-2" />
        <p className="text-xs text-gray-500">Image unavailable</p>
      </div>
    </div>
  );

  // Don't render anything if no src and no fallback
  if (!src && !fallback) {
    return <ErrorFallback />;
  }

  return (
    <div 
      ref={placeholderRef}
      className={`relative overflow-hidden ${className}`}
      style={{ width, height }}
    >
      {/* Placeholder */}
      {placeholder === 'blur' && <BlurPlaceholder />}
      
      {/* Main image */}
      {(isIntersecting || loading === 'eager') && src && imageState !== 'error' && (
        <img
          ref={imgRef}
          src={src}
          srcSet={generateSrcSet(src)}
          sizes={sizes}
          alt={alt}
          className={`w-full h-full object-cover transition-opacity duration-300 ${
            imageState === 'loaded' ? 'opacity-100' : 'opacity-0'
          }`}
          loading={loading}
          onLoad={handleImageLoad}
          onError={handleImageError}
          decoding="async"
        />
      )}
      
      {/* Fallback image */}
      {imageState === 'error' && fallback && (
        <img
          src={fallback}
          alt={alt}
          className="w-full h-full object-cover"
          onError={() => setImageState('error')}
        />
      )}
      
      {/* Error state */}
      {imageState === 'error' && !fallback && <ErrorFallback />}
      
      {/* Loading indicator for non-blur placeholder */}
      {placeholder === 'empty' && imageState === 'loading' && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
          <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
        </div>
      )}
    </div>
  );
}

/**
 * Optimized avatar component for user profiles
 */
export function OptimizedAvatar({
  src,
  alt,
  size = 40,
  fallbackText,
  className = ''
}: {
  src?: string;
  alt: string;
  size?: number;
  fallbackText?: string;
  className?: string;
}) {
  const [imageError, setImageError] = useState(false);

  if (!src || imageError) {
    return (
      <div 
        className={`flex items-center justify-center bg-gradient-to-br from-blue-500 to-purple-600 text-white font-semibold rounded-full ${className}`}
        style={{ width: size, height: size, fontSize: size * 0.4 }}
      >
        {fallbackText || alt.charAt(0).toUpperCase()}
      </div>
    );
  }

  return (
    <OptimizedImage
      src={src}
      alt={alt}
      className={`rounded-full ${className}`}
      width={size}
      height={size}
      loading="eager"
      placeholder="blur"
      onError={() => setImageError(true)}
    />
  );
}

/**
 * Image gallery component for multiple images
 */
export function OptimizedImageGallery({
  images,
  className = '',
  itemsPerRow = 3
}: {
  images: Array<{ src: string; alt: string; id?: string }>;
  className?: string;
  itemsPerRow?: number;
}) {
  return (
    <div 
      className={`grid gap-4 ${className}`}
      style={{ gridTemplateColumns: `repeat(${itemsPerRow}, 1fr)` }}
    >
      {images.map((image, index) => (
        <OptimizedImage
          key={image.id || index}
          src={image.src}
          alt={image.alt}
          className="aspect-square rounded-lg"
          loading={index < 6 ? 'eager' : 'lazy'} // Load first 6 immediately
          placeholder="blur"
        />
      ))}
    </div>
  );
}