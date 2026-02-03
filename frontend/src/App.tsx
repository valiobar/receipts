import { JSX } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '@/store/auth.context';
import { DevicesProvider } from '@/store/devices.context';
import { ReceiptsProvider } from '@/store/receipts.context';
import { ThemeProvider } from '@/store/theme.context';
import { ProtectedRoute } from '@/components/common/ProtectedRoute';
import { Layout } from '@/components/common/Layout';
import { Login } from '@/pages/Login';
import { Dashboard } from '@/pages/Dashboard';
import { Receipts } from '@/pages/Receipts';
import { Devices } from '@/pages/Devices';

/**
 * Main App component with routing and context providers
 */
export const App = (): JSX.Element => {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <DevicesProvider>
            <ReceiptsProvider>
              <Routes>
              {/* Public route: Login */}
              <Route path="/login" element={<Login />} />

              {/* Protected routes with Layout */}
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <Dashboard />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/receipts"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <Receipts />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/devices"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <Devices />
                    </Layout>
                  </ProtectedRoute>
                }
              />

              {/* 404 redirect to dashboard */}
              <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </ReceiptsProvider>
          </DevicesProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
};

