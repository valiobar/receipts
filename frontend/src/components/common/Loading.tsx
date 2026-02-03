import { JSX } from 'react';

interface LoadingProps {
  size?: 'sm' | 'md' | 'lg';
  message?: string;
}

const SIZE_CLASSES = {
  sm: 'w-4 h-4 border-2',
  md: 'w-8 h-8 border-2',
  lg: 'w-12 h-12 border-4',
};

export const Loading = ({ size = 'md', message }: LoadingProps): JSX.Element => {
  return (
    <div className="flex flex-col items-center justify-center gap-4 p-4">
      <div
        className={`${SIZE_CLASSES[size]} border-gray-300 dark:border-gray-600 border-t-primary-500 dark:border-t-primary-400 rounded-full animate-spin`}
        role="status"
        aria-label="Loading"
      />
      {message && (
        <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">{message}</p>
      )}
    </div>
  );
};

