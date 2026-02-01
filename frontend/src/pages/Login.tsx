import { JSX, useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import type { LoginCredentials } from '@/types';

export const Login = (): JSX.Element => {
  const navigate = useNavigate();
  const { login, isLoading } = useAuth();
  const [credentials, setCredentials] = useState<LoginCredentials>({
    username: '',
    password: '',
  });
  const [error, setError] = useState<string | null>(null);

  const handleInputChange = (field: keyof LoginCredentials, value: string): void => {
    setCredentials((prev) => ({
      ...prev,
      [field]: value,
    }));
    // Clear error when user starts typing
    if (error) {
      setError(null);
    }
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setError(null);

    // Basic validation
    if (!credentials.username.trim()) {
      setError('Username is required');
      return;
    }

    if (!credentials.password.trim()) {
      setError('Password is required');
      return;
    }

    try {
      await login(credentials);
      // Redirect to dashboard on successful login
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed. Please try again.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            Receipt Management System
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Sign in to your account
          </p>
        </div>

        {/* Login Form */}
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 space-y-6">
            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <svg
                    className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-red-800">Error</p>
                    <p className="mt-1 text-sm text-red-600">{error}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Username Input */}
            <Input
              id="username"
              type="text"
              label="Username"
              placeholder="Enter your username"
              value={credentials.username}
              onChange={(e) => handleInputChange('username', e.target.value)}
              required
              autoComplete="username"
              disabled={isLoading}
              error={error && !credentials.username.trim() ? 'Username is required' : undefined}
              aria-label="Username"
            />

            {/* Password Input */}
            <Input
              id="password"
              type="password"
              label="Password"
              placeholder="Enter your password"
              value={credentials.password}
              onChange={(e) => handleInputChange('password', e.target.value)}
              required
              autoComplete="current-password"
              disabled={isLoading}
              error={error && !credentials.password.trim() ? 'Password is required' : undefined}
              aria-label="Password"
            />

            {/* Submit Button */}
            <div>
              <Button
                type="submit"
                variant="primary"
                size="lg"
                isLoading={isLoading}
                disabled={isLoading}
                className="w-full"
                data-testid="login-submit-button"
              >
                {isLoading ? 'Signing in...' : 'Sign in'}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

