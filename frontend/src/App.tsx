import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { NotificationProvider } from './context/NotificationContext';
import { Layout } from './components/layout/Layout';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Products } from './pages/Products';
import { Materials } from './pages/Materials';
import { BOMs } from './pages/BOMs';
import { ProductionOrders } from './pages/ProductionOrders';
import { AssemblyTracking } from './pages/AssemblyTracking';
import { QCTesting } from './pages/QCTesting';
import { FinishedGoodsPage } from './pages/FinishedGoods';
import { DispatchPage } from './pages/Dispatch';
import { ReportsPage } from './pages/Reports';
import { AuditLogsPage } from './pages/AuditLogs';
import { Role } from './types';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: Role[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && user.role !== 'ADMIN' && !allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

export const App: React.FC = () => {
  return (
    <ThemeProvider>
      <AuthProvider>
        <NotificationProvider>
          <BrowserRouter>
            <Routes>
              {/* Public route */}
              <Route path="/login" element={<Login />} />

              {/* Protected App Layout */}
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <Layout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<Navigate to="/dashboard" replace />} />
                <Route path="dashboard" element={<Dashboard />} />
                <Route
                  path="products"
                  element={
                    <ProtectedRoute allowedRoles={['ADMIN', 'PRODUCTION_SUPERVISOR']}>
                      <Products />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="materials"
                  element={
                    <ProtectedRoute allowedRoles={['ADMIN', 'STORE_KEEPER']}>
                      <Materials />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="bom"
                  element={
                    <ProtectedRoute allowedRoles={['ADMIN', 'PRODUCTION_SUPERVISOR']}>
                      <BOMs />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="production-orders"
                  element={
                    <ProtectedRoute allowedRoles={['ADMIN', 'PRODUCTION_SUPERVISOR']}>
                      <ProductionOrders />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="assembly-tracking"
                  element={
                    <ProtectedRoute allowedRoles={['ADMIN', 'PRODUCTION_SUPERVISOR']}>
                      <AssemblyTracking />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="qc-testing"
                  element={
                    <ProtectedRoute allowedRoles={['ADMIN', 'QC_ENGINEER']}>
                      <QCTesting />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="finished-goods"
                  element={
                    <ProtectedRoute allowedRoles={['ADMIN', 'STORE_KEEPER', 'DISPATCH_TEAM']}>
                      <FinishedGoodsPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="dispatch"
                  element={
                    <ProtectedRoute allowedRoles={['ADMIN', 'DISPATCH_TEAM']}>
                      <DispatchPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="reports"
                  element={
                    <ProtectedRoute allowedRoles={['ADMIN', 'PRODUCTION_SUPERVISOR', 'STORE_KEEPER']}>
                      <ReportsPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="audit-logs"
                  element={
                    <ProtectedRoute allowedRoles={['ADMIN', 'PRODUCTION_SUPERVISOR']}>
                      <AuditLogsPage />
                    </ProtectedRoute>
                  }
                />
              </Route>

              {/* Wildcard redirect */}
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </BrowserRouter>
        </NotificationProvider>
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;
