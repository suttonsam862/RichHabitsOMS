import { useState, useCallback } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { z } from 'zod';
import { 
  emailValidator, 
  phoneValidator, 
  zipValidator, 
  priceValidator,
  nameValidator,
  validateAndFormatEmail,
  formatPhoneNumber,
  formatZipCode,
  formatPrice
} from '../lib/validators';

interface FieldValidationState {
  [key: string]: {
    isValid: boolean;
    error?: string;
    isValidating: boolean;
    hasBlurred: boolean;
  };
}

interface UseFieldValidationOptions {
  form: UseFormReturn<any>;
  validators?: Record<string, z.ZodSchema>;
  formatters?: Record<string, (value: string) => string>;
  realtimeFields?: string[];
}

export function useFieldValidation({
  form,
  validators = {},
  formatters = {},
  realtimeFields = []
}: UseFieldValidationOptions) {
  const [fieldStates, setFieldStates] = useState<FieldValidationState>({});

  // Default validators for common fields
  const defaultValidators = {
    email: emailValidator,
    phone: phoneValidator,
    zip: zipValidator,
    zipCode: zipValidator,
    postalCode: zipValidator,
    basePrice: priceValidator,
    base_price: priceValidator,
    unitPrice: priceValidator,
    unit_price: priceValidator,
    totalPrice: priceValidator,
    total_price: priceValidator,
    price: priceValidator,
    firstName: nameValidator,
    first_name: nameValidator,
    lastName: nameValidator,
    last_name: nameValidator,
    name: nameValidator
  };

  // Default formatters for common fields
  const defaultFormatters = {
    email: (value: string) => value.toLowerCase().trim(),
    phone: formatPhoneNumber,
    zip: formatZipCode,
    zipCode: formatZipCode,
    postalCode: formatZipCode,
    basePrice: (value: string) => formatPrice(value, ''),
    base_price: (value: string) => formatPrice(value, ''),
    unitPrice: (value: string) => formatPrice(value, ''),
    unit_price: (value: string) => formatPrice(value, ''),
    totalPrice: (value: string) => formatPrice(value, ''),
    total_price: (value: string) => formatPrice(value, ''),
    price: (value: string) => formatPrice(value, '')
  };

  // Merge custom validators with defaults
  const allValidators = { ...defaultValidators, ...validators };
  const allFormatters = { ...defaultFormatters, ...formatters };

  // Validate a single field
  const validateField = useCallback(async (fieldName: string, value: any): Promise<{ isValid: boolean; error?: string }> => {
    const validator = allValidators[fieldName];
    
    if (!validator) {
      return { isValid: true };
    }

    try {
      await validator.parseAsync(value);
      return { isValid: true };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return { 
          isValid: false, 
          error: error.errors[0]?.message || 'Invalid value'
        };
      }
      return { 
        isValid: false, 
        error: 'Validation failed'
      };
    }
  }, [allValidators]);

  // Handle field blur with validation and formatting
  const handleFieldBlur = useCallback(async (fieldName: string) => {
    const currentValue = form.getValues(fieldName);
    
    // Mark field as blurred
    setFieldStates(prev => ({
      ...prev,
      [fieldName]: {
        ...prev[fieldName],
        hasBlurred: true,
        isValidating: true
      }
    }));

    // Validate the field
    const validation = await validateField(fieldName, currentValue);
    
    // Apply formatting if available and validation passed
    if (validation.isValid && allFormatters[fieldName] && currentValue) {
      const formatted = allFormatters[fieldName](currentValue.toString());
      if (formatted !== currentValue) {
        form.setValue(fieldName, formatted, { shouldDirty: true });
      }
    }

    // Update field state
    setFieldStates(prev => ({
      ...prev,
      [fieldName]: {
        ...prev[fieldName],
        isValid: validation.isValid,
        error: validation.error,
        isValidating: false,
        hasBlurred: true
      }
    }));

    // If validation failed, set form error
    if (!validation.isValid) {
      form.setError(fieldName, {
        type: 'manual',
        message: validation.error
      });
    } else {
      form.clearErrors(fieldName);
    }
  }, [form, validateField, allFormatters]);

  // Handle real-time validation on change
  const handleFieldChange = useCallback(async (fieldName: string, value: any) => {
    // Only validate in real-time if field is in realtimeFields array and has been blurred
    if (!realtimeFields.includes(fieldName) || !fieldStates[fieldName]?.hasBlurred) {
      return;
    }

    setFieldStates(prev => ({
      ...prev,
      [fieldName]: {
        ...prev[fieldName],
        isValidating: true
      }
    }));

    const validation = await validateField(fieldName, value);
    
    setFieldStates(prev => ({
      ...prev,
      [fieldName]: {
        ...prev[fieldName],
        isValid: validation.isValid,
        error: validation.error,
        isValidating: false
      }
    }));

    if (!validation.isValid) {
      form.setError(fieldName, {
        type: 'manual',
        message: validation.error
      });
    } else {
      form.clearErrors(fieldName);
    }
  }, [validateField, realtimeFields, fieldStates, form]);

  // Special email validation with immediate feedback
  const handleEmailBlur = useCallback(async (fieldName: string) => {
    const email = form.getValues(fieldName);
    
    setFieldStates(prev => ({
      ...prev,
      [fieldName]: {
        ...prev[fieldName],
        hasBlurred: true,
        isValidating: true
      }
    }));

    if (email) {
      const validation = validateAndFormatEmail(email);
      
      // Format the email
      if (validation.isValid && validation.formatted !== email) {
        form.setValue(fieldName, validation.formatted, { shouldDirty: true });
      }

      setFieldStates(prev => ({
        ...prev,
        [fieldName]: {
          ...prev[fieldName],
          isValid: validation.isValid,
          error: validation.error,
          isValidating: false,
          hasBlurred: true
        }
      }));

      if (!validation.isValid) {
        form.setError(fieldName, {
          type: 'manual',
          message: validation.error || 'Invalid email format'
        });
      } else {
        form.clearErrors(fieldName);
      }
    } else {
      setFieldStates(prev => ({
        ...prev,
        [fieldName]: {
          ...prev[fieldName],
          isValidating: false,
          hasBlurred: true
        }
      }));
    }
  }, [form]);

  // Get field validation state
  const getFieldState = useCallback((fieldName: string) => {
    return fieldStates[fieldName] || {
      isValid: true,
      isValidating: false,
      hasBlurred: false
    };
  }, [fieldStates]);

  // Get field validation classes for styling
  const getFieldClasses = useCallback((fieldName: string) => {
    const state = getFieldState(fieldName);
    const hasError = form.formState.errors[fieldName];
    
    if (!state.hasBlurred) {
      return 'border-input'; // Default styling
    }
    
    if (state.isValidating) {
      return 'border-yellow-400 bg-yellow-50'; // Validating state
    }
    
    if (hasError || !state.isValid) {
      return 'border-red-500 bg-red-50'; // Error state
    }
    
    if (state.isValid && state.hasBlurred) {
      return 'border-green-500 bg-green-50'; // Success state
    }
    
    return 'border-input';
  }, [getFieldState, form.formState.errors]);

  // Validate all fields that have been blurred
  const validateAllBlurredFields = useCallback(async () => {
    const blurredFields = Object.entries(fieldStates)
      .filter(([_, state]) => state.hasBlurred)
      .map(([fieldName]) => fieldName);

    for (const fieldName of blurredFields) {
      const value = form.getValues(fieldName);
      await handleFieldChange(fieldName, value);
    }
  }, [fieldStates, form, handleFieldChange]);

  // Reset field validation state
  const resetFieldState = useCallback((fieldName?: string) => {
    if (fieldName) {
      setFieldStates(prev => ({
        ...prev,
        [fieldName]: {
          isValid: true,
          isValidating: false,
          hasBlurred: false
        }
      }));
    } else {
      setFieldStates({});
    }
  }, []);

  return {
    fieldStates,
    handleFieldBlur,
    handleFieldChange,
    handleEmailBlur,
    getFieldState,
    getFieldClasses,
    validateField,
    validateAllBlurredFields,
    resetFieldState
  };
}