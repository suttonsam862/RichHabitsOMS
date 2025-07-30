import { z } from 'zod';

// ===========================
// BASIC FIELD VALIDATORS
// ===========================

/**
 * Email validation with comprehensive RFC compliance
 */
export const emailValidator = z
  .string()
  .min(1, "Email is required")
  .email("Please enter a valid email address")
  .max(254, "Email address is too long")
  .refine(
    (email) => {
      // Additional validation for common email issues
      const parts = email.split('@');
      if (parts.length !== 2) return false;
      const [localPart, domain] = parts;
      
      // Local part validation (before @)
      if (localPart.length === 0 || localPart.length > 64) return false;
      if (localPart.startsWith('.') || localPart.endsWith('.')) return false;
      if (localPart.includes('..')) return false;
      
      // Domain validation (after @)
      if (domain.length === 0 || domain.length > 253) return false;
      if (domain.startsWith('-') || domain.endsWith('-')) return false;
      if (!domain.includes('.')) return false;
      
      return true;
    },
    {
      message: "Please enter a valid email address"
    }
  );

/**
 * Phone number validation supporting multiple formats
 */
export const phoneValidator = z
  .string()
  .optional()
  .refine(
    (phone) => {
      if (!phone || phone.trim() === '') return true; // Optional field
      
      // Remove all non-digit characters for validation
      const digitsOnly = phone.replace(/\D/g, '');
      
      // Must be 10-15 digits (international range)
      if (digitsOnly.length < 10 || digitsOnly.length > 15) return false;
      
      // US phone numbers: must be exactly 10 digits if starting with area code
      if (digitsOnly.length === 10) {
        // First digit of area code can't be 0 or 1
        if (digitsOnly[0] === '0' || digitsOnly[0] === '1') return false;
        // First digit of exchange can't be 0 or 1
        if (digitsOnly[3] === '0' || digitsOnly[3] === '1') return false;
      }
      
      return true;
    },
    {
      message: "Please enter a valid phone number (10-15 digits)"
    }
  );

/**
 * Required phone number validation
 */
export const phoneRequiredValidator = z
  .string()
  .min(1, "Phone number is required")
  .refine(
    (phone) => {
      const digitsOnly = phone.replace(/\D/g, '');
      if (digitsOnly.length < 10 || digitsOnly.length > 15) return false;
      
      if (digitsOnly.length === 10) {
        if (digitsOnly[0] === '0' || digitsOnly[0] === '1') return false;
        if (digitsOnly[3] === '0' || digitsOnly[3] === '1') return false;
      }
      
      return true;
    },
    {
      message: "Please enter a valid phone number (10-15 digits)"
    }
  );

/**
 * ZIP/Postal code validation for US and international
 */
export const zipValidator = z
  .string()
  .optional()
  .refine(
    (zip) => {
      if (!zip || zip.trim() === '') return true; // Optional field
      
      // US ZIP codes: 12345 or 12345-6789
      const usZipRegex = /^\d{5}(-\d{4})?$/;
      
      // Canadian postal codes: A1A 1A1 or A1A1A1
      const canadianPostalRegex = /^[A-Za-z]\d[A-Za-z][ -]?\d[A-Za-z]\d$/;
      
      // UK postal codes: SW1A 1AA or M1 1AA or B33 8TH
      const ukPostalRegex = /^[A-Za-z]{1,2}\d[A-Za-z\d]?\s?\d[A-Za-z]{2}$/;
      
      // General international: 3-10 alphanumeric characters
      const internationalRegex = /^[A-Za-z0-9\s-]{3,10}$/;
      
      return (
        usZipRegex.test(zip) ||
        canadianPostalRegex.test(zip) ||
        ukPostalRegex.test(zip) ||
        internationalRegex.test(zip)
      );
    },
    {
      message: "Please enter a valid ZIP/postal code"
    }
  );

/**
 * Required ZIP/Postal code validation
 */
export const zipRequiredValidator = z
  .string()
  .min(1, "ZIP/postal code is required")
  .refine(
    (zip) => {
      const usZipRegex = /^\d{5}(-\d{4})?$/;
      const canadianPostalRegex = /^[A-Za-z]\d[A-Za-z][ -]?\d[A-Za-z]\d$/;
      const ukPostalRegex = /^[A-Za-z]{1,2}\d[A-Za-z\d]?\s?\d[A-Za-z]{2}$/;
      const internationalRegex = /^[A-Za-z0-9\s-]{3,10}$/;
      
      return (
        usZipRegex.test(zip) ||
        canadianPostalRegex.test(zip) ||
        ukPostalRegex.test(zip) ||
        internationalRegex.test(zip)
      );
    },
    {
      message: "Please enter a valid ZIP/postal code"
    }
  );

/**
 * Price validation for monetary amounts
 */
export const priceValidator = z
  .union([z.string(), z.number()])
  .refine(
    (value) => {
      const numValue = typeof value === 'string' ? parseFloat(value) : value;
      return !isNaN(numValue) && numValue >= 0;
    },
    {
      message: "Price must be a valid positive number"
    }
  )
  .transform((value) => {
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    return Math.round(numValue * 100) / 100; // Round to 2 decimal places
  });

/**
 * Required price validation
 */
export const priceRequiredValidator = z
  .union([z.string().min(1, "Price is required"), z.number()])
  .refine(
    (value) => {
      if (typeof value === 'string' && value.trim() === '') return false;
      const numValue = typeof value === 'string' ? parseFloat(value) : value;
      return !isNaN(numValue) && numValue > 0;
    },
    {
      message: "Price must be a valid positive number greater than 0"
    }
  )
  .transform((value) => {
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    return Math.round(numValue * 100) / 100;
  });

/**
 * Quantity validation for order items
 */
export const quantityValidator = z
  .union([z.string(), z.number()])
  .refine(
    (value) => {
      const numValue = typeof value === 'string' ? parseInt(value, 10) : value;
      return Number.isInteger(numValue) && numValue > 0 && numValue <= 10000;
    },
    {
      message: "Quantity must be a whole number between 1 and 10,000"
    }
  )
  .transform((value) => {
    return typeof value === 'string' ? parseInt(value, 10) : value;
  });

// ===========================
// NAME VALIDATORS
// ===========================

/**
 * Person name validation (first name, last name)
 */
export const nameValidator = z
  .string()
  .min(1, "Name is required")
  .max(50, "Name must be 50 characters or less")
  .refine(
    (name) => {
      // Allow letters, spaces, hyphens, apostrophes, and periods
      const nameRegex = /^[a-zA-Z\s\-'.]+$/;
      return nameRegex.test(name.trim());
    },
    {
      message: "Name can only contain letters, spaces, hyphens, apostrophes, and periods"
    }
  )
  .transform((name) => {
    // Capitalize first letter of each word
    return name
      .trim()
      .split(/\s+/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  });

/**
 * Company/Organization name validation
 */
export const companyNameValidator = z
  .string()
  .optional()
  .refine(
    (name) => {
      if (!name || name.trim() === '') return true; // Optional field
      
      // Allow letters, numbers, spaces, and common business punctuation
      const companyRegex = /^[a-zA-Z0-9\s\-'.&,()]+$/;
      return name.trim().length <= 100 && companyRegex.test(name.trim());
    },
    {
      message: "Company name must be 100 characters or less and contain only letters, numbers, and common punctuation"
    }
  )
  .transform((name) => name?.trim() || '');

/**
 * Required company name validation
 */
export const companyNameRequiredValidator = z
  .string()
  .min(1, "Company name is required")
  .max(100, "Company name must be 100 characters or less")
  .refine(
    (name) => {
      const companyRegex = /^[a-zA-Z0-9\s\-'.&,()]+$/;
      return companyRegex.test(name.trim());
    },
    {
      message: "Company name can only contain letters, numbers, spaces, and common punctuation"
    }
  )
  .transform((name) => name.trim());

/**
 * Product/Item name validation
 */
export const productNameValidator = z
  .string()
  .min(1, "Product name is required")
  .max(100, "Product name must be 100 characters or less")
  .refine(
    (name) => {
      // Allow alphanumeric, spaces, and common product punctuation
      const productRegex = /^[a-zA-Z0-9\s\-'.()/#&]+$/;
      return productRegex.test(name.trim());
    },
    {
      message: "Product name can only contain letters, numbers, spaces, and common punctuation"
    }
  )
  .transform((name) => name.trim());

// ===========================
// ADDRESS VALIDATORS
// ===========================

/**
 * Street address validation
 */
export const addressValidator = z
  .string()
  .optional()
  .refine(
    (address) => {
      if (!address || address.trim() === '') return true; // Optional field
      
      // Allow alphanumeric, spaces, and common address punctuation
      const addressRegex = /^[a-zA-Z0-9\s\-'.#,()]+$/;
      return address.trim().length <= 200 && addressRegex.test(address.trim());
    },
    {
      message: "Address must be 200 characters or less and contain valid characters"
    }
  )
  .transform((address) => address?.trim() || '');

/**
 * Required street address validation
 */
export const addressRequiredValidator = z
  .string()
  .min(1, "Address is required")
  .max(200, "Address must be 200 characters or less")
  .refine(
    (address) => {
      const addressRegex = /^[a-zA-Z0-9\s\-'.#,()]+$/;
      return addressRegex.test(address.trim());
    },
    {
      message: "Address can only contain letters, numbers, spaces, and common punctuation"
    }
  )
  .transform((address) => address.trim());

/**
 * City name validation
 */
export const cityValidator = z
  .string()
  .optional()
  .refine(
    (city) => {
      if (!city || city.trim() === '') return true; // Optional field
      
      // Allow letters, spaces, hyphens, and apostrophes
      const cityRegex = /^[a-zA-Z\s\-'.]+$/;
      return city.trim().length <= 50 && cityRegex.test(city.trim());
    },
    {
      message: "City name must be 50 characters or less and contain only letters, spaces, and basic punctuation"
    }
  )
  .transform((city) => city?.trim() || '');

/**
 * Required city validation
 */
export const cityRequiredValidator = z
  .string()
  .min(1, "City is required")
  .max(50, "City name must be 50 characters or less")
  .refine(
    (city) => {
      const cityRegex = /^[a-zA-Z\s\-'.]+$/;
      return cityRegex.test(city.trim());
    },
    {
      message: "City name can only contain letters, spaces, and basic punctuation"
    }
  )
  .transform((city) => city.trim());

/**
 * State/Province validation
 */
export const stateValidator = z
  .string()
  .optional()
  .refine(
    (state) => {
      if (!state || state.trim() === '') return true; // Optional field
      
      // Allow letters, spaces, and hyphens (for compound state names)
      const stateRegex = /^[a-zA-Z\s\-]+$/;
      return state.trim().length <= 50 && stateRegex.test(state.trim());
    },
    {
      message: "State/Province must be 50 characters or less and contain only letters, spaces, and hyphens"
    }
  )
  .transform((state) => state?.trim() || '');

/**
 * Country validation
 */
export const countryValidator = z
  .string()
  .optional()
  .refine(
    (country) => {
      if (!country || country.trim() === '') return true; // Optional field
      
      // Allow letters, spaces, and hyphens
      const countryRegex = /^[a-zA-Z\s\-]+$/;
      return country.trim().length <= 50 && countryRegex.test(country.trim());
    },
    {
      message: "Country must be 50 characters or less and contain only letters, spaces, and hyphens"
    }
  )
  .transform((country) => country?.trim() || '');

// ===========================
// BUSINESS VALIDATORS
// ===========================

/**
 * SKU (Stock Keeping Unit) validation
 */
export const skuValidator = z
  .string()
  .min(1, "SKU is required")
  .max(50, "SKU must be 50 characters or less")
  .refine(
    (sku) => {
      // Allow alphanumeric, hyphens, and underscores
      const skuRegex = /^[A-Z0-9\-_]+$/;
      return skuRegex.test(sku.trim());
    },
    {
      message: "SKU can only contain uppercase letters, numbers, hyphens, and underscores"
    }
  )
  .transform((sku) => sku.trim().toUpperCase());

/**
 * Order number validation
 */
export const orderNumberValidator = z
  .string()
  .min(1, "Order number is required")
  .max(30, "Order number must be 30 characters or less")
  .refine(
    (orderNum) => {
      // Allow alphanumeric, hyphens, and underscores
      const orderRegex = /^[A-Z0-9\-_]+$/;
      return orderRegex.test(orderNum.trim());
    },
    {
      message: "Order number can only contain uppercase letters, numbers, hyphens, and underscores"
    }
  )
  .transform((orderNum) => orderNum.trim().toUpperCase());

/**
 * Description/Notes validation
 */
export const descriptionValidator = z
  .string()
  .optional()
  .refine(
    (description) => {
      if (!description || description.trim() === '') return true; // Optional field
      return description.trim().length <= 1000;
    },
    {
      message: "Description must be 1000 characters or less"
    }
  )
  .transform((description) => description?.trim() || '');

/**
 * Required description validation
 */
export const descriptionRequiredValidator = z
  .string()
  .min(1, "Description is required")
  .max(1000, "Description must be 1000 characters or less")
  .transform((description) => description.trim());

// ===========================
// DATE VALIDATORS
// ===========================

/**
 * Date string validation (YYYY-MM-DD format)
 */
export const dateValidator = z
  .string()
  .optional()
  .refine(
    (date) => {
      if (!date || date.trim() === '') return true; // Optional field
      
      // Check YYYY-MM-DD format
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(date)) return false;
      
      // Check if it's a valid date
      const parsedDate = new Date(date);
      return parsedDate instanceof Date && !isNaN(parsedDate.getTime());
    },
    {
      message: "Please enter a valid date in YYYY-MM-DD format"
    }
  );

/**
 * Required date validation
 */
export const dateRequiredValidator = z
  .string()
  .min(1, "Date is required")
  .refine(
    (date) => {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(date)) return false;
      
      const parsedDate = new Date(date);
      return parsedDate instanceof Date && !isNaN(parsedDate.getTime());
    },
    {
      message: "Please enter a valid date in YYYY-MM-DD format"
    }
  );

/**
 * Future date validation (must be in the future)
 */
export const futureDateValidator = z
  .string()
  .min(1, "Date is required")
  .refine(
    (date) => {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(date)) return false;
      
      const parsedDate = new Date(date);
      if (!(parsedDate instanceof Date) || isNaN(parsedDate.getTime())) return false;
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      return parsedDate >= today;
    },
    {
      message: "Date must be today or in the future"
    }
  );

// ===========================
// UTILITY FUNCTIONS
// ===========================

/**
 * Format phone number for display
 */
export function formatPhoneNumber(phone: string): string {
  const digitsOnly = phone.replace(/\D/g, '');
  
  if (digitsOnly.length === 10) {
    // US format: (123) 456-7890
    return `(${digitsOnly.slice(0, 3)}) ${digitsOnly.slice(3, 6)}-${digitsOnly.slice(6)}`;
  }
  
  if (digitsOnly.length === 11 && digitsOnly.startsWith('1')) {
    // US with country code: +1 (123) 456-7890
    return `+1 (${digitsOnly.slice(1, 4)}) ${digitsOnly.slice(4, 7)}-${digitsOnly.slice(7)}`;
  }
  
  // International format: keep as entered
  return phone;
}

/**
 * Format price for display
 */
export function formatPrice(price: number | string, currency = '$'): string {
  const numPrice = typeof price === 'string' ? parseFloat(price) : price;
  
  if (isNaN(numPrice)) return `${currency}0.00`;
  
  return `${currency}${numPrice.toFixed(2)}`;
}

/**
 * Format ZIP code for display
 */
export function formatZipCode(zip: string): string {
  const trimmedZip = zip.trim();
  
  // US ZIP+4 format
  if (/^\d{9}$/.test(trimmedZip)) {
    return `${trimmedZip.slice(0, 5)}-${trimmedZip.slice(5)}`;
  }
  
  // Canadian postal code format
  if (/^[A-Za-z]\d[A-Za-z]\d[A-Za-z]\d$/.test(trimmedZip)) {
    return `${trimmedZip.slice(0, 3).toUpperCase()} ${trimmedZip.slice(3).toUpperCase()}`;
  }
  
  return trimmedZip.toUpperCase();
}

/**
 * Validate and format email
 */
export function validateAndFormatEmail(email: string): { isValid: boolean; formatted: string; error?: string } {
  try {
    const result = emailValidator.parse(email);
    return { isValid: true, formatted: result.toLowerCase() };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { isValid: false, formatted: email, error: error.errors[0]?.message };
    }
    return { isValid: false, formatted: email, error: 'Invalid email format' };
  }
}

/**
 * Check if a string contains only valid characters for names
 */
export function isValidNameCharacters(name: string): boolean {
  const nameRegex = /^[a-zA-Z\s\-'.]+$/;
  return nameRegex.test(name);
}

/**
 * Check if a price string is valid
 */
export function isValidPrice(price: string): boolean {
  const numValue = parseFloat(price);
  return !isNaN(numValue) && numValue >= 0;
}

// ===========================
// COMPOSITE VALIDATORS
// ===========================

/**
 * Complete customer validation schema
 */
export const customerValidationSchema = z.object({
  firstName: nameValidator,
  lastName: nameValidator,
  email: emailValidator,
  phone: phoneValidator,
  company: companyNameValidator,
  address: addressValidator,
  city: cityValidator,
  state: stateValidator,
  zip: zipValidator,
  country: countryValidator,
  status: z.enum(['active', 'inactive', 'suspended']).default('active')
});

/**
 * Complete order validation schema
 */
export const orderValidationSchema = z.object({
  orderNumber: orderNumberValidator,
  customerId: z.string().min(1, "Customer is required"),
  status: z.enum(['draft', 'design', 'production', 'completed', 'cancelled']).default('draft'),
  priority: z.enum(['low', 'medium', 'high']).default('medium'),
  totalAmount: priceRequiredValidator,
  notes: descriptionValidator,
  deliveryDate: dateValidator
});

/**
 * Complete catalog item validation schema
 */
export const catalogItemValidationSchema = z.object({
  name: productNameValidator,
  sku: skuValidator,
  basePrice: priceRequiredValidator,
  category: z.string().min(1, "Category is required"),
  description: descriptionValidator,
  status: z.enum(['active', 'inactive', 'discontinued']).default('active')
});

export type CustomerValidation = z.infer<typeof customerValidationSchema>;
export type OrderValidation = z.infer<typeof orderValidationSchema>;
export type CatalogItemValidation = z.infer<typeof catalogItemValidationSchema>;