import { JSX } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from './Button';

interface HeaderProps {
  className?: string;
}

export const Header = ({ className = '' }: HeaderProps): JSX.Element => {
  const { user, logout } = useAuth();

  const handleLogout = async (): Promise<void> => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const displayName = user?.email || user?.username || 'User';

  return (
    <header
      className={`
        fixed top-0 left-0 right-0 z-30
        bg-white shadow-sm border-b border-gray-200
        ${className}
      `.trim()}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Left side - Logo/Title */}
          <div className="flex items-center">
            <h1 className="text-xl font-semibold text-gray-900">Receipts Management</h1>
          </div>

          {/* Right side - User info and logout */}
          <div className="flex items-center gap-4">
            {/* User info */}
            <div className="hidden sm:flex flex-col items-end">
              <span className="text-sm font-medium text-gray-900">{displayName}</span>
              {user?.roles && user.roles.length > 0 && (
                <span className="text-xs text-gray-500">{user.roles.join(', ')}</span>
              )}
            </div>

            {/* Mobile user display */}
            <div className="sm:hidden">
              <span className="text-sm font-medium text-gray-900">{displayName}</span>
            </div>

            {/* Logout button */}
            <Button
              variant="secondary"
              size="sm"
              onClick={handleLogout}
              aria-label="Logout"
            >
              <span className="hidden sm:inline">Logout</span>
              <svg
                className="sm:hidden w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                />
              </svg>
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
};

