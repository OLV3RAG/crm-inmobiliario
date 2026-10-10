// File: src/App.tsx
import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { SplashScreen } from '@/components/common/SplashScreen';
import { AppLayout } from '@/components/layout/AppLayout';
import { LoginView } from '@/features/auth/views/LoginView';
import { MainDashboardView } from '@/features/dashboard/views/MainDashboardView';
import { PipelineView } from '@/features/pipeline/views/PipelineView';
import { ContactsView } from '@/features/contacts/views/ContactsView';
import { PropertiesView } from '@/features/properties/views/PropertiesView';
import { QuotesView } from '@/features/quotes/views/QuotesView';
import { AuditLogsView } from '@/features/audit/views/AuditLogsView';
import { SettingsView } from '@/features/settings/views/SettingsView';
import { ConversationsView } from '@/features/conversations/views/ConversationsView';
import { ThemeProvider } from '@/context/ThemeContext';
import { CrmProvider } from '@/context/CrmContext';
import { AuthProvider, useAuthContext } from '@/context/AuthContext';

// Protected Route Component
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthContext();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  const { isAuthenticated } = useAuthContext();
  const [showSplash, setShowSplash] = useState(true);

  return (
    <>
      {showSplash && <SplashScreen onFinish={() => setShowSplash(false)} />}
      <Routes>
        {/* Auth Route */}
        <Route 
          path="/login" 
          element={
            isAuthenticated ? (
              <Navigate to="/" replace />
            ) : (
              <LoginView />
            )
          } 
        />

        {/* Protected Routes inside Layout */}
        <Route 
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/" element={<MainDashboardView />} />
          <Route path="/dashboard" element={<MainDashboardView />} />
          <Route path="/pipeline" element={<PipelineView />} />
          <Route path="/contacts" element={<ContactsView />} />
          <Route path="/properties" element={<PropertiesView />} />
          <Route path="/quotes" element={<QuotesView />} />
          <Route path="/audit" element={<AuditLogsView />} />
          <Route path="/settings" element={<SettingsView />} />
          <Route path="/conversations" element={<ConversationsView />} />
          
          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </>
  );
}

export default function App() {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="zenith-ui-theme">
      <AuthProvider>
        <CrmProvider>
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </CrmProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
