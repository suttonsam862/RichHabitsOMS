/**
 * BULLETPROOF SIZES INPUT COMPONENT
 * Handles comma-separated size input with validation
 */

import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';

interface SizesInputProps {
  value: string[];
  onChange: (sizes: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function SizesInput({ value, onChange, placeholder = "Enter sizes separated by commas (e.g., S, M, L, XL)", disabled = false }: SizesInputProps) {
  const [inputValue, setInputValue] = useState('');
  const [sizes, setSizes] = useState<string[]>(value || []);

  // Update local state when value prop changes
  useEffect(() => {
    setSizes(value || []);
    setInputValue(value?.join(', ') || '');
  }, [value]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    
    // Parse comma-separated values
    const parsedSizes = newValue
      .split(',')
      .map(size => size.trim())
      .filter(size => size.length > 0);
    
    setSizes(parsedSizes);
    onChange(parsedSizes);
  };

  const removeSize = (indexToRemove: number) => {
    const newSizes = sizes.filter((_, index) => index !== indexToRemove);
    setSizes(newSizes);
    setInputValue(newSizes.join(', '));
    onChange(newSizes);
  };

  return (
    <div className="space-y-2">
      <Label htmlFor="sizes-input">Available Sizes</Label>
      <Input
        id="sizes-input"
        value={inputValue}
        onChange={handleInputChange}
        placeholder={placeholder}
        disabled={disabled}
        className="w-full"
      />
      
      {sizes.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2">
          {sizes.map((size, index) => (
            <Badge
              key={index}
              variant="secondary"
              className="flex items-center gap-1 px-2 py-1"
            >
              {size}
              {!disabled && (
                <button
                  type="button"
                  onClick={() => removeSize(index)}
                  className="hover:bg-red-500 hover:text-white rounded-full p-0.5 ml-1"
                >
                  <X size={12} />
                </button>
              )}
            </Badge>
          ))}
        </div>
      )}
      
      <p className="text-sm text-muted-foreground">
        Sizes: {sizes.length} items - {sizes.join(', ') || 'None'}
      </p>
    </div>
  );
}