/**
 * File Upload Validation Utilities
 * Provides consistent file validation across all upload components
 */

export interface FileValidationResult {
  isValid: boolean;
  error?: string;
  errorTitle?: string;
}

export interface FileValidationOptions {
  maxSizeMB?: number;
  allowedTypes?: string[];
  allowedExtensions?: string[];
}

/**
 * Default file validation settings
 */
export const DEFAULT_VALIDATION_OPTIONS: FileValidationOptions = {
  maxSizeMB: 5,
  allowedTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
  allowedExtensions: ['.jpg', '.jpeg', '.png', '.webp']
};

/**
 * Validates a single file based on size and type constraints
 */
export function validateFile(
  file: File, 
  options: FileValidationOptions = DEFAULT_VALIDATION_OPTIONS
): FileValidationResult {
  const { maxSizeMB = 5, allowedTypes = DEFAULT_VALIDATION_OPTIONS.allowedTypes } = options;
  
  // Check file size
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  if (file.size > maxSizeBytes) {
    return {
      isValid: false,
      errorTitle: "File too large",
      error: `${file.name} exceeds ${maxSizeMB}MB limit. Please compress the file or choose a smaller one.`
    };
  }
  
  // Check file type
  if (allowedTypes && !allowedTypes.includes(file.type)) {
    const typeNames = allowedTypes.map(type => type.split('/')[1].toUpperCase()).join(', ');
    return {
      isValid: false,
      errorTitle: "Invalid file type",
      error: `${file.name} is not a valid file type. Please select a ${typeNames} file.`
    };
  }
  
  return { isValid: true };
}

/**
 * Validates multiple files and returns detailed results
 */
export function validateFiles(
  files: File[], 
  options: FileValidationOptions = DEFAULT_VALIDATION_OPTIONS
): {
  validFiles: File[];
  invalidFiles: { file: File; result: FileValidationResult }[];
  allValid: boolean;
} {
  const validFiles: File[] = [];
  const invalidFiles: { file: File; result: FileValidationResult }[] = [];
  
  files.forEach(file => {
    const result = validateFile(file, options);
    if (result.isValid) {
      validFiles.push(file);
    } else {
      invalidFiles.push({ file, result });
    }
  });
  
  return {
    validFiles,
    invalidFiles,
    allValid: invalidFiles.length === 0
  };
}

/**
 * Formats file size in human-readable format
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Generates validation message for UI display
 */
export function getValidationMessage(options: FileValidationOptions = DEFAULT_VALIDATION_OPTIONS): string {
  const { maxSizeMB = 5, allowedTypes = DEFAULT_VALIDATION_OPTIONS.allowedTypes } = options;
  const typeNames = allowedTypes.map(type => type.split('/')[1].toUpperCase()).join(', ');
  return `${typeNames} up to ${maxSizeMB}MB`;
}

/**
 * Hook for consistent file validation with toast notifications
 */
import { useToast } from '@/hooks/use-toast';

export function useFileValidation(options: FileValidationOptions = DEFAULT_VALIDATION_OPTIONS) {
  const { toast } = useToast();
  
  const validateAndNotify = (file: File): boolean => {
    const result = validateFile(file, options);
    
    if (!result.isValid) {
      toast({
        title: result.errorTitle!,
        description: result.error!,
        variant: "destructive",
      });
      return false;
    }
    
    return true;
  };
  
  const validateMultipleAndNotify = (files: File[]): File[] => {
    const validation = validateFiles(files, options);
    
    // Show toast for each invalid file
    validation.invalidFiles.forEach(({ result }) => {
      toast({
        title: result.errorTitle!,
        description: result.error!,
        variant: "destructive",
      });
    });
    
    return validation.validFiles;
  };
  
  return {
    validateAndNotify,
    validateMultipleAndNotify,
    getValidationMessage: () => getValidationMessage(options),
    formatFileSize
  };
}