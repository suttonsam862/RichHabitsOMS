/**
 * Shared form validation utilities
 * Extracted from multiple components for consistency and reusability
 */

// Email validation regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Phone validation regex (US format)
const PHONE_REGEX = /^\+?1?[-.\s]?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}$/;

// Required field validation
export const validateRequired = (value: string, fieldName: string): string | null => {
  if (!value || value.trim().length === 0) {
    return `${fieldName} is required`;
  }
  return null;
};

// Email validation
export const validateEmail = (email: string): string | null => {
  if (!email) {
    return 'Email is required';
  }
  if (!EMAIL_REGEX.test(email)) {
    return 'Please enter a valid email address';
  }
  return null;
};

// Phone validation
export const validatePhone = (phone: string): string | null => {
  if (!phone) {
    return null; // Phone is optional in most forms
  }
  if (!PHONE_REGEX.test(phone)) {
    return 'Please enter a valid phone number';
  }
  return null;
};

// Password validation
export const validatePassword = (password: string): string | null => {
  if (!password) {
    return 'Password is required';
  }
  if (password.length < 8) {
    return 'Password must be at least 8 characters long';
  }
  if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
    return 'Password must contain at least one uppercase letter, one lowercase letter, and one number';
  }
  return null;
};

// Generic text length validation
export const validateTextLength = (text: string, fieldName: string, minLength: number = 2, maxLength: number = 100): string | null => {
  if (text && text.length < minLength) {
    return `${fieldName} must be at least ${minLength} characters long`;
  }
  if (text && text.length > maxLength) {
    return `${fieldName} must be less than ${maxLength} characters long`;
  }
  return null;
};

// Order quantity validation
export const validateQuantity = (quantity: number | string): string | null => {
  const num = typeof quantity === 'string' ? parseInt(quantity, 10) : quantity;

  if (isNaN(num) || num <= 0) {
    return 'Quantity must be a positive number';
  }
  if (num > 10000) {
    return 'Quantity cannot exceed 10,000 items';
  }
  return null;
};

// Price validation
export const validatePrice = (price: number | string): string | null => {
  const num = typeof price === 'string' ? parseFloat(price) : price;

  if (isNaN(num) || num < 0) {
    return 'Price must be a valid positive number';
  }
  if (num > 100000) {
    return 'Price cannot exceed $100,000';
  }
  return null;
};

// Combined customer form validation
export const validateCustomerForm = (formData: {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  company?: string;
}): Record<string, string> => {
  const errors: Record<string, string> = {};

  const firstNameError = validateRequired(formData.firstName, 'First name') || 
                        validateTextLength(formData.firstName, 'First name', 2, 50);
  if (firstNameError) errors.firstName = firstNameError;

  const lastNameError = validateRequired(formData.lastName, 'Last name') || 
                       validateTextLength(formData.lastName, 'Last name', 2, 50);
  if (lastNameError) errors.lastName = lastNameError;

  const emailError = validateEmail(formData.email);
  if (emailError) errors.email = emailError;

  const phoneError = validatePhone(formData.phone || '');
  if (phoneError) errors.phone = phoneError;

  const companyError = validateTextLength(formData.company || '', 'Company', 0, 100);
  if (companyError) errors.company = companyError;

  return errors;
};

// Combined order form validation
export const validateOrderForm = (formData: {
  customerId: string;
  items: Array<{ productName: string; quantity: number; unitPrice: number }>;
  notes?: string;
}): Record<string, string> => {
  const errors: Record<string, string> = {};

  if (!formData.customerId) {
    errors.customerId = 'Customer is required';
  }

  if (!formData.items || formData.items.length === 0) {
    errors.items = 'At least one item is required';
  } else {
    formData.items.forEach((item, index) => {
      const quantityError = validateQuantity(item.quantity);
      if (quantityError) errors[`items.${index}.quantity`] = quantityError;

      const priceError = validatePrice(item.unitPrice);
      if (priceError) errors[`items.${index}.unitPrice`] = priceError;

      const productNameError = validateRequired(item.productName, 'Product name');
      if (productNameError) errors[`items.${index}.productName`] = productNameError;
    });
  }

  const notesError = validateTextLength(formData.notes || '', 'Notes', 0, 1000);
  if (notesError) errors.notes = notesError;

  return errors;
};