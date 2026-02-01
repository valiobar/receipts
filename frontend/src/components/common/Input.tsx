import { JSX, InputHTMLAttributes, forwardRef } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  validationState?: 'default' | 'error' | 'success';
}

const INPUT_BASE_CLASSES =
  'w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-1 transition-colors duration-200';

const VALIDATION_CLASSES = {
  default: 'border-gray-300 focus:ring-primary-500 focus:border-primary-500',
  error: 'border-red-500 focus:ring-red-500 focus:border-red-500',
  success: 'border-green-500 focus:ring-green-500 focus:border-green-500',
};

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    { label, error, validationState = 'default', className = '', ...props },
    ref
  ): JSX.Element => {
    const state = error ? 'error' : validationState;
    const inputClasses = `${INPUT_BASE_CLASSES} ${VALIDATION_CLASSES[state]} ${className}`.trim();

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={props.id}
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={inputClasses}
          aria-invalid={state === 'error'}
          aria-describedby={error ? `${props.id}-error` : undefined}
          {...props}
        />
        {error && (
          <p
            id={`${props.id}-error`}
            className="mt-1 text-sm text-red-600"
            role="alert"
          >
            {error}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

