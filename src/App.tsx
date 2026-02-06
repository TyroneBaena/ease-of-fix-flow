// src/App.tsx - Performance Optimized v1.0
import React, { useEffect, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/sonner";
import { UnifiedAuthProvider, useSimpleAuth } from "@/contexts/UnifiedAuthContext";
import { UserProvider } from "@/contexts/UserContext";
import { SubscriptionProvider } from "@/contexts/subscription/SubscriptionContext";
import { MaintenanceRequestProvider } from "@/contexts/maintenance";
import { PropertyProvider } from "@/contexts/property/PropertyContext";
import { ContractorProvider } from "@/contexts/contractor";
import ProtectedRoute from "@/components/ProtectedRoute";
import { OrganizationGuard } from "@/components/routing/OrganizationGuard";
import { AdminRouteGuard } from "@/components/AdminRouteGuard";
import ErrorBoundary from "@/components/ui/error-boundary";
import { Loader2 } from "lucide-react";

// Supabase - use singleton instance only
import { cleanupOldAuthStorage } from "@/utils/cleanupOldAuthStorage";
import { PublicPropertyWrapper } from "@/components/PublicPropertyWrapper";
import { ContractorAuthProvider } from "@/contexts/contractor/ContractorAuthContext";
import { ContractorRouteGuard } from "@/components/contractor/ContractorRouteGuard";
import { ActivityTrackingProvider } from "@/components/ActivityTrackingProvider";

// ============================================================================
// LAZY LOADED PAGES - Code splitting for ~60% smaller initial bundle
// ============================================================================

// Auth pages
const Login = React.lazy(() => import("@/pages/Login"));
const Signup = React.lazy(() => import("@/pages/Signup"));
const SignupStatus = React.lazy(() => import("@/pages/SignupStatus"));
const ForgotPassword = React.lazy(() => import("@/pages/ForgotPassword"));
const SetupPassword = React.lazy(() => import("@/pages/SetupPassword"));
const EmailConfirm = React.lazy(() => import("@/pages/EmailConfirm"));
const Onboarding = React.lazy(() => import("@/pages/Onboarding"));

// Core pages
const Dashboard = React.lazy(() => import("@/pages/Dashboard"));
const Settings = React.lazy(() => import("@/pages/Settings"));
const Properties = React.lazy(() => import("@/pages/Properties"));
const PropertyDetail = React.lazy(() => import("@/pages/PropertyDetail"));
const AllRequests = React.lazy(() => import("@/pages/AllRequests"));
const NewRequest = React.lazy(() => import("@/pages/NewRequest"));
const RequestDetail = React.lazy(() => import("@/pages/RequestDetail"));
const Reports = React.lazy(() => import("@/pages/Reports"));
const Notifications = React.lazy(() => import("@/pages/Notifications"));
const NotFound = React.lazy(() => import("@/pages/NotFound"));

// Public pages
const PublicPropertyRequests = React.lazy(() => import("@/pages/PublicPropertyRequests"));
const PublicRequestDetail = React.lazy(() => import("@/pages/PublicRequestDetail"));
const PublicRequestSubmitted = React.lazy(() => import("@/pages/PublicRequestSubmitted"));
const QRCodeRedirect = React.lazy(() => import("@/components/QRCodeRedirect"));

// Contractor pages
const ContractorDashboard = React.lazy(() => import("@/pages/ContractorDashboard"));
const ContractorJobs = React.lazy(() => import("@/pages/contractor/ContractorJobs"));
const ContractorJobDetail = React.lazy(() => import("@/pages/ContractorJobDetail"));
const ContractorProfile = React.lazy(() => import("@/pages/contractor/ContractorProfile"));
const ContractorSchedule = React.lazy(() => import("@/pages/contractor/ContractorSchedule"));
const ContractorSettings = React.lazy(() => import("@/pages/contractor/ContractorSettings"));
const ContractorNotifications = React.lazy(() => import("@/pages/ContractorNotifications"));
const QuoteSubmission = React.lazy(() => import("@/pages/contractor/QuoteSubmission"));

// Admin pages
const AdminSettings = React.lazy(() => import("@/pages/AdminSettings"));
const AdminSyncTest = React.lazy(() => import("@/pages/AdminSyncTest"));

// ============================================================================
// PAGE LOADER - Fallback component for lazy-loaded routes
// ============================================================================
const PageLoader = () => (
  <div className="flex h-screen w-full items-center justify-center bg-background">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
  </div>
);

// ============================================================================
// REACT QUERY CONFIGURATION
// ============================================================================
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      refetchOnReconnect: false,
      staleTime: 5 * 60 * 1000, // 5 minutes - data considered fresh
      gcTime: 10 * 60 * 1000, // 10 minutes - keep in cache
      retry: 2,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
    },
    mutations: { retry: false },
  },
});

// ============================================================================
// SETUP PASSWORD ROUTE HELPER
// ============================================================================
const SetupPasswordRoute = () => {
  const { currentUser } = useSimpleAuth();
  const hasForcePasswordChange = sessionStorage.getItem('force_password_change') === 'true';
  
  console.log("🔐 SetupPasswordRoute check:", {
    hasCurrentUser: !!currentUser,
    hasForcePasswordChange
  });
  
  if (!currentUser || hasForcePasswordChange) {
    return <SetupPassword />;
  }
  
  return <Navigate to="/dashboard" replace />;
};

// ============================================================================
// APP ROUTES - With Suspense for code splitting
// ============================================================================
const AppRoutes = () => {
  const { currentUser, loading, isInitialized } = useSimpleAuth();

  if (loading && !isInitialized) {
    return <PageLoader />;
  }

  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* Admin routes */}
        <Route
          path="/admin/sync-test"
          element={
            <AdminRouteGuard>
              <AdminSyncTest />
            </AdminRouteGuard>
          }
        />

        {/* Public routes */}
        <Route path="/login" element={currentUser ? <Navigate to="/dashboard" replace /> : <Login />} />
        <Route path="/signup" element={currentUser ? <Navigate to="/dashboard" replace /> : <Signup />} />
        <Route path="/signup-status" element={<SignupStatus />} />
        <Route
          path="/forgot-password"
          element={currentUser ? <Navigate to="/dashboard" replace /> : <ForgotPassword />}
        />
        <Route path="/setup-password" element={<SetupPasswordRoute />} />
        <Route path="/email-confirm" element={<EmailConfirm />} />
        <Route path="/onboarding" element={<Onboarding />} />
        
        {/* QR code routes - public access */}
        <Route path="/qr/:token" element={<QRCodeRedirect />} />
        <Route path="/property-requests/:id" element={<PublicPropertyRequests />} />
        <Route path="/public-request/:id" element={<PublicRequestDetail />} />
        <Route path="/request-submitted" element={<PublicRequestSubmitted />} />

        {/* Root route */}
        <Route
          path="/"
          element={
            <OrganizationGuard>
              {currentUser ? <Navigate to="/dashboard" replace /> : <Navigate to="/login" replace />}
            </OrganizationGuard>
          }
        />

        {/* Organization-protected routes */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <OrganizationGuard>
                <Dashboard />
              </OrganizationGuard>
            </ProtectedRoute>
          }
        />

        <Route
          path="/requests"
          element={
            <ProtectedRoute>
              <OrganizationGuard>
                <AllRequests />
              </OrganizationGuard>
            </ProtectedRoute>
          }
        />

        <Route
          path="/requests/new"
          element={
            <ProtectedRoute>
              <OrganizationGuard>
                <NewRequest />
              </OrganizationGuard>
            </ProtectedRoute>
          }
        />

        <Route 
          path="/new-request" 
          element={
            <PublicPropertyWrapper>
              <NewRequest />
            </PublicPropertyWrapper>
          } 
        />

        <Route
          path="/requests/:id"
          element={
            <ProtectedRoute>
              <OrganizationGuard>
                <RequestDetail />
              </OrganizationGuard>
            </ProtectedRoute>
          }
        />

        <Route
          path="/properties"
          element={
            <ProtectedRoute>
              <OrganizationGuard>
                <Properties />
              </OrganizationGuard>
            </ProtectedRoute>
          }
        />

        <Route
          path="/properties/:id"
          element={
            <ProtectedRoute>
              <OrganizationGuard>
                <PropertyDetail />
              </OrganizationGuard>
            </ProtectedRoute>
          }
        />

        <Route
          path="/reports"
          element={
            <ProtectedRoute>
              <OrganizationGuard>
                <Reports />
              </OrganizationGuard>
            </ProtectedRoute>
          }
        />

        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <OrganizationGuard>
                <Settings />
              </OrganizationGuard>
            </ProtectedRoute>
          }
        />

        <Route
          path="/notifications"
          element={
            <ProtectedRoute>
              <OrganizationGuard>
                <Notifications />
              </OrganizationGuard>
            </ProtectedRoute>
          }
        />

        {/* Contractor routes */}
        <Route
          path="/contractor-dashboard"
          element={
            <ProtectedRoute>
              <ContractorAuthProvider>
                <ContractorRouteGuard>
                  <ContractorDashboard />
                </ContractorRouteGuard>
              </ContractorAuthProvider>
            </ProtectedRoute>
          }
        />

        <Route
          path="/contractor-jobs"
          element={
            <ProtectedRoute>
              <ContractorAuthProvider>
                <ContractorRouteGuard>
                  <ContractorJobs />
                </ContractorRouteGuard>
              </ContractorAuthProvider>
            </ProtectedRoute>
          }
        />

        <Route
          path="/contractor-jobs/:id"
          element={
            <ProtectedRoute>
              <ContractorAuthProvider>
                <ContractorRouteGuard>
                  <ContractorJobDetail />
                </ContractorRouteGuard>
              </ContractorAuthProvider>
            </ProtectedRoute>
          }
        />

        <Route
          path="/contractor-profile"
          element={
            <ProtectedRoute>
              <ContractorAuthProvider>
                <ContractorRouteGuard>
                  <ContractorProfile />
                </ContractorRouteGuard>
              </ContractorAuthProvider>
            </ProtectedRoute>
          }
        />

        <Route
          path="/contractor-schedule"
          element={
            <ProtectedRoute>
              <ContractorAuthProvider>
                <ContractorRouteGuard>
                  <ContractorSchedule />
                </ContractorRouteGuard>
              </ContractorAuthProvider>
            </ProtectedRoute>
          }
        />

        <Route
          path="/contractor-settings"
          element={
            <ProtectedRoute>
              <ContractorAuthProvider>
                <ContractorRouteGuard>
                  <ContractorSettings />
                </ContractorRouteGuard>
              </ContractorAuthProvider>
            </ProtectedRoute>
          }
        />

        <Route
          path="/contractor-notifications"
          element={
            <ProtectedRoute>
              <ContractorAuthProvider>
                <ContractorRouteGuard>
                  <ContractorNotifications />
                </ContractorRouteGuard>
              </ContractorAuthProvider>
            </ProtectedRoute>
          }
        />

        <Route
          path="/contractor/quote-submission/:id"
          element={
            <ProtectedRoute>
              <ContractorAuthProvider>
                <ContractorRouteGuard>
                  <QuoteSubmission />
                </ContractorRouteGuard>
              </ContractorAuthProvider>
            </ProtectedRoute>
          }
        />

        {/* Billing & Security Settings */}
        <Route
          path="/billing-security"
          element={
            <ProtectedRoute>
              <OrganizationGuard>
                <AdminSettings />
              </OrganizationGuard>
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
};

// ============================================================================
// MAIN APP COMPONENT
// ============================================================================
const App: React.FC = () => {
  useEffect(() => {
    console.log("🔧 App initialization - Performance Optimized Build");
    cleanupOldAuthStorage();
  }, []);

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <UnifiedAuthProvider>
            <UserProvider>
              <SubscriptionProvider>
                <MaintenanceRequestProvider>
                  <PropertyProvider>
                    <ContractorProvider>
                      <ActivityTrackingProvider>
                        <AppRoutes />
                        <Toaster />
                      </ActivityTrackingProvider>
                    </ContractorProvider>
                  </PropertyProvider>
                </MaintenanceRequestProvider>
              </SubscriptionProvider>
            </UserProvider>
          </UnifiedAuthProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

export default App;
