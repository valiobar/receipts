import { JSX, ReactNode } from 'react';
import { Sidebar } from './Sidebar';

interface LayoutProps {
  children: ReactNode;
}

export const Layout = ({ children }: LayoutProps): JSX.Element => {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Main layout container */}
      <div className="flex">
        {/* Sidebar */}
        <Sidebar />

        {/* Main content area */}
        <main className="flex-1 lg:ml-64">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

