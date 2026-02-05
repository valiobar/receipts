/**
 * Validate email format
 * @param email - Email string to validate
 * @returns True if email is valid
 */
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validate required field
 * @param value - Value to check
 * @returns True if value is not empty
 */
export const isRequired = (value: string | undefined | null): boolean => {
  if (typeof value === 'string') {
    return value.trim().length > 0;
  }
  return value !== undefined && value !== null;
};

/**
 * Validate minimum length
 * @param value - String value
 * @param minLength - Minimum length required
 * @returns True if value meets minimum length
 */
export const hasMinLength = (value: string, minLength: number): boolean => {
  return value.length >= minLength;
};

/**
 * Validate maximum length
 * @param value - String value
 * @param maxLength - Maximum length allowed
 * @returns True if value is within maximum length
 */
export const hasMaxLength = (value: string, maxLength: number): boolean => {
  return value.length <= maxLength;
};

/**
 * Validate date range
 * @param startDate - Start date string
 * @param endDate - End date string
 * @returns True if start date is before or equal to end date
 */
export const isValidDateRange = (startDate: string, endDate: string): boolean => {
  try {
    const start = new Date(startDate);
    const end = new Date(endDate);
    return start <= end;
  } catch (error) {
    return false;
  }
};

/**
 * Validate numeric string
 * @param value - String to validate
 * @returns True if value is a valid number
 */
export const isNumeric = (value: string): boolean => {
  return !isNaN(Number(value)) && value.trim() !== '';
};

/**
 * Validate positive number
 * @param value - String or number to validate
 * @returns True if value is a positive number
 */
export const isPositiveNumber = (value: string | number): boolean => {
  const num = typeof value === 'string' ? Number(value) : value;
  return !isNaN(num) && num > 0;
};

/**
 * Validation error message type
 */
export interface ValidationError {
  field: string;
  message: string;
}

/**
 * Validate form fields
 * @param fields - Object with field names and values
 * @param rules - Validation rules for each field
 * @returns Array of validation errors
 */
export const validateForm = (
  fields: Record<string, unknown>,
  rules: Record<string, Array<(value: unknown) => boolean | string>>
): ValidationError[] => {
  const errors: ValidationError[] = [];

  Object.entries(rules).forEach(([fieldName, fieldRules]) => {
    const value = fields[fieldName];

    fieldRules.forEach((rule) => {
      const result = rule(value);
      if (result !== true) {
        errors.push({
          field: fieldName,
          message: typeof result === 'string' ? result : `${fieldName} is invalid`,
        });
      }
    });
  });

  return errors;
};


