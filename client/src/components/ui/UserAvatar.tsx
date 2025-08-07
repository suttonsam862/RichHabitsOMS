/**
 * USER AVATAR COMPONENT
 * Standalone user avatar component with fallback support
 */

import React from 'react';

interface UserAvatarProps {
  src?: string;
  alt?: string;
  fallbackText?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function UserAvatar({ 
  src, 
  alt = "User", 
  fallbackText = "U", 
  size = 'md', 
  className = "" 
}: UserAvatarProps) {
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
}