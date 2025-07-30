import { useEffect, useState } from 'react';
import { useForm, FieldValues, UseFormReturn } from 'react-hook-form';
import { deepEqual } from '@/lib/utils';

interface UseFormValidationOptions<T extends FieldValues> {
  form: UseFormReturn<T>;
  initialData?: T;
  requiredFields: (keyof T)[];
  ignoreFields?: (keyof T)[];
}

interface FormValidationState {
  isValid: boolean;
  hasChanges: boolean;
  canSubmit: boolean;
  errors: string[];
  missingRequiredFields: string[];
  changedFields: string[];
}

/**
 * Custom hook for comprehensive form validation that prevents submission
 * when required fields are blank or data is unchanged
 */
export function useFormValidation<T extends FieldValues>({
  form,
  initialData,
  requiredFields,
  ignoreFields = []
}: UseFormValidationOptions<T>): FormValidationState {
  const [validationState, setValidationState] = useState<FormValidationState>({
    isValid: false,
    hasChanges: false,
    canSubmit: false,
    errors: [],
    missingRequiredFields: [],
    changedFields: []
  });

  // Watch all form values for changes
  const watchedValues = form.watch();

  useEffect(() => {
    const validateForm = () => {
      const formValues = form.getValues();
      const formErrors = form.formState.errors;
      const errors: string[] = [];
      const changedFields: string[] = [];
      const missingRequiredFields: string[] = [];

      // Check for form validation errors
      const hasFormErrors = Object.keys(formErrors).length > 0;
      if (hasFormErrors) {
        Object.entries(formErrors).forEach(([field, error]) => {
          if (error?.message) {
            errors.push(`${field}: ${error.message}`);
          }
        });
      }

      // Check required fields
      requiredFields.forEach((field) => {
        const value = formValues[field];
        const isEmpty = value === undefined || 
                       value === null || 
                       value === '' || 
                       (Array.isArray(value) && value.length === 0);
        
        if (isEmpty) {
          missingRequiredFields.push(String(field));
          errors.push(`${String(field)} is required`);
        }
      });

      // Check if form has changes compared to initial data and track changed fields
      let hasChanges = false;
      if (initialData) {
        // Check each field for changes
        Object.keys(formValues).forEach(field => {
          if (!ignoreFields.includes(field)) {
            const currentValue = formValues[field];
            const initialValue = initialData[field];
            
            if (!deepEqual(currentValue, initialValue)) {
              changedFields.push(field);
              hasChanges = true;
            }
          }
        });
      } else {
        // If no initial data, check if any required fields have values
        hasChanges = requiredFields.some((field) => {
          const value = formValues[field];
          const hasValue = value !== undefined && value !== null && value !== '' && 
                 (!Array.isArray(value) || value.length > 0);
          
          if (hasValue) {
            changedFields.push(String(field));
          }
          
          return hasValue;
        });
      }

      // Form is valid if no errors and no missing required fields
      const isValid = errors.length === 0 && missingRequiredFields.length === 0;
      
      // Can submit if valid and has changes
      const canSubmit = isValid && hasChanges;

      setValidationState({
        isValid,
        hasChanges,
        canSubmit,
        errors,
        missingRequiredFields,
        changedFields
      });
    };

    validateForm();
  }, [watchedValues, initialData, requiredFields, ignoreFields, form]);

  return validationState;
}

