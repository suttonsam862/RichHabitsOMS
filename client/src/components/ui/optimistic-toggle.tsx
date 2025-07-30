import React from 'react';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface OptimisticToggleProps {
  checked: boolean;
  onToggle: () => void;
  isPending?: boolean;
  isOptimistic?: boolean;
  label?: string;
  checkedLabel?: string;
  uncheckedLabel?: string;
  variant?: 'switch' | 'badge';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  className?: string;
}

export function OptimisticToggle({
  checked,
  onToggle,
  isPending = false,
  isOptimistic = false,
  label,
  checkedLabel,
  uncheckedLabel,
  variant = 'switch',
  size = 'md',
  disabled = false,
  className,
}: OptimisticToggleProps) {
  if (variant === 'badge') {
    return (
      <Badge
        variant={checked ? 'default' : 'secondary'}
        className={cn(
          'cursor-pointer transition-all duration-200 relative',
          isOptimistic && 'opacity-70',
          isPending && 'cursor-wait',
          disabled && 'cursor-not-allowed opacity-50',
          size === 'sm' && 'text-xs px-2 py-1',
          size === 'lg' && 'text-sm px-3 py-1.5',
          className
        )}
        onClick={!disabled ? onToggle : undefined}
      >
        {isPending && (
          <Loader2 className="w-3 h-3 mr-1 animate-spin" />
        )}
        {checked ? checkedLabel : uncheckedLabel}
        {isOptimistic && (
          <span className="absolute -top-1 -right-1 w-2 h-2 bg-yellow-400 rounded-full animate-pulse" />
        )}
      </Badge>
    );
  }

  return (
    <div className={cn('flex items-center space-x-2', className)}>
      <Switch
        checked={checked}
        onCheckedChange={!disabled ? onToggle : undefined}
        disabled={disabled || isPending}
        className={cn(
          'transition-all duration-200',
          isOptimistic && 'opacity-70',
          size === 'sm' && 'scale-75',
          size === 'lg' && 'scale-125'
        )}
      />
      {label && (
        <label className={cn(
          'text-sm font-medium cursor-pointer transition-opacity',
          isOptimistic && 'opacity-70',
          disabled && 'cursor-not-allowed opacity-50'
        )}
        onClick={!disabled ? onToggle : undefined}
        >
          {label}
          {isPending && (
            <Loader2 className="w-3 h-3 ml-1 inline animate-spin" />
          )}
          {isOptimistic && (
            <span className="ml-1 text-yellow-600 text-xs">(updating...)</span>
          )}
        </label>
      )}
    </div>
  );
}