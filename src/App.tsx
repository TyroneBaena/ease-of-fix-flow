import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/sonner';
import ProtectedRoute from '@/components/ProtectedRoute';
import OrganizationGuard from '@/components/OrganizationGuard';
import ErrorBoundary from '@/components/ui/error-boundary';
import { UnifiedAuthProvider, useSimpleAuth } from '@/contexts/UnifiedAuthContext';
import { UserProvider } from '@/contexts/UserContext';
import { Loader2 } from 'lucide-react';

// Import all pages
import Index from '@/pages/Index';
import Login from '@/pages/Login';
import Signup from '@/pages/Signup';
import SignupStatus from '@/pages/SignupStatus';
import ForgotPassword from '@/pages/ForgotPassword';
import SetupPassword from '@/pages/SetupPassword';
import EmailConfirm from '@/pages/EmailConfirm';
import Dashboard from '@/pages/Dashboard';
import AllRequests from '@/pages/AllRequests';
import NewRequest from '@/pages/NewRequest';
import RequestDetail from '@/pages/RequestDetail';
import PublicRequestDetail from '@/pages/PublicRequestDetail';
import Properties from '@/pages/Properties';
import PropertyDetail from '@/pages/PropertyDetail';
import PropertyRequestsView from '@/pages/PropertyRequestsView';
import PublicPropertyRequests from '@/pages/PublicPropertyRequests';
import QRCodeRedirect from '@/components/QRCodeRedirect';
import PublicNewRequestRedirect from '@/components/PublicNewRequestRedirect';
import PropertyAccess from '@/pages/PropertyAccess';
import Settings from '@/pages/Settings';
import Reports from '@/pages/Reports';
import Notifications from '@/pages/Notifications';
import NotFound from '@/pages/NotFound';

// Contractor pages
import ContractorDashboard from '@/pages/ContractorDashboard';
import ContractorJobs from '@/pages/contractor/ContractorJobs';
import ContractorJobDetail from '@/pages/ContractorJobDetail';
import ContractorProfile from '@/pages/contractor/ContractorProfile';
import ContractorSchedule from '@/pages/contractor/ContractorSchedule';
import ContractorSettings from '@/pages/contractor/ContractorSettings';
import ContractorNotifications from '@/pages/ContractorNotifications';
import QuoteSubmission from './pages/contractor/QuoteSubmission';
import PropertyDetailWrapper from '@/components/PropertyDetailWrapper';
import NewRequestWrapper from '@/components/NewRequestWrapper';
import PaymentMethodSetup from '@/pages/PaymentMethodSetup';

// Context providers for specific features
import { SubscriptionProvider } from './contexts/subscription/SubscriptionContext';
import { MaintenanceRequestProvider } from './contexts/maintenance';
import { PropertyProvider } from './contexts/property/PropertyContext';
import { ContractorProvider } from './contexts/contractor';
import { ContractorAuthProvider } from './contexts/contractor/ContractorAuthContext';
import { ContractorRouteGuard } from './components/contractor/ContractorRouteGuard';

// New pages
import Pricing from '@/pages/Pricing';
import AdminSettings from '@/pages/AdminSettings';
import Billing from '@/pages/Billing';
import { AdminRouteGuard } from '@/components/AdminRouteGuard';
import { EnhancedSignupFlow } from '@/components/auth/EnhancedSignupFlow';
import { TeamManagement } from '@/pages/TeamManagement';

const queryClient = new QueryClient();

function AppRoutes() {
  const { loading } = useSimpleAuth();
  const [forceReady, setForceReady] = React.useState(false);

  // Failsafe: Force app to render after maximum wait time
  React.useEffect(() => {
    const failsafeTimer = setTimeout(() => {
      if (loading && !forceReady) {
        console.error('⚠️ AppRoutes - Loading timeout exceeded! Forcing app to render.');
        setForceReady(true);
      }
    }, 10000); // 10 second failsafe

    return () => clearTimeout(failsafeTimer);
  }, [loading, forceReady]);

  // Show loading screen while auth is initializing (unless failsafe triggered)
  if (loading && !forceReady) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <Routes>
            {/* Public routes */}
            <Route path="/" element={<Index />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/signup-status" element={<SignupStatus />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/setup-password" element={<SetupPassword />} />
            <Route path="/email-confirm" element={<EmailConfirm />} />
            
            {/* Protected routes */}
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <OrganizationGuard>
                  <MaintenanceRequestProvider>
                    <PropertyProvider>
                      <Dashboard />
                    </PropertyProvider>
                  </MaintenanceRequestProvider>
                </OrganizationGuard>
              </ProtectedRoute>
            } />
            
            <Route path="/requests" element={
              <ProtectedRoute>
                <OrganizationGuard>
                  <MaintenanceRequestProvider>
                    <PropertyProvider>
                      <ContractorProvider>
                        <AllRequests />
                      </ContractorProvider>
                    </PropertyProvider>
                  </MaintenanceRequestProvider>
                </OrganizationGuard>
              </ProtectedRoute>
            } />
            
            <Route path="/new-request" element={<NewRequestWrapper />} />
            
            {/* Public request detail route for QR code access */}
            <Route path="/public-request/:id" element={<PublicRequestDetail />} />
            
            <Route path="/requests/:id" element={
              <ProtectedRoute>
                <OrganizationGuard>
                  <MaintenanceRequestProvider>
                    <ContractorProvider>
                      <RequestDetail />
                    </ContractorProvider>
                  </MaintenanceRequestProvider>
                </OrganizationGuard>
              </ProtectedRoute>
            } />
            
            <Route path="/properties" element={
              <ProtectedRoute>
                <OrganizationGuard>
                  <PropertyProvider>
                    <Properties />
                  </PropertyProvider>
                </OrganizationGuard>
              </ProtectedRoute>
            } />
            
            <Route path="/properties/:id" element={<PropertyDetailWrapper />} />
            
            {/* QR code route - validates token and creates temporary session */}
            <Route path="/qr/:token" element={<QRCodeRedirect />} />
            
            {/* Legacy QR code route - for backward compatibility */}
            <Route path="/property-requests/:id" element={<PublicPropertyRequests />} />
            
            {/* Temporary property access route */}
            <Route path="/property-access/:propertyId" element={<PropertyAccess />} />
            
            {/* Public new request route - redirects to login with context */}
            <Route path="/public-new-request" element={<PublicNewRequestRedirect />} />
            
            {/* Private property requests route - requires authentication */}
            <Route path="/private/property-requests/:id" element={
              <ProtectedRoute>
                <OrganizationGuard>
                  <PropertyRequestsView />
                </OrganizationGuard>
              </ProtectedRoute>
            } />
            
            {/* Settings route - allow managers but restrict contractor access */}
            <Route path="/settings" element={
              <ProtectedRoute>
                <OrganizationGuard>
                  <PropertyProvider>
                    <Settings />
                  </PropertyProvider>
                </OrganizationGuard>
              </ProtectedRoute>
            } />
            
            <Route path="/reports" element={
              <ProtectedRoute>
                <OrganizationGuard>
                  <PropertyProvider>
                    <Reports />
                  </PropertyProvider>
                </OrganizationGuard>
              </ProtectedRoute>
            } />
            
            <Route path="/notifications" element={
              <ProtectedRoute>
                <OrganizationGuard>
                  <Notifications />
                </OrganizationGuard>
              </ProtectedRoute>
            } />
            
            {/* Contractor routes */}
            <Route path="/contractor-dashboard" element={
              <ProtectedRoute>
                <ContractorAuthProvider>
                  <ContractorRouteGuard>
                    <ContractorDashboard />
                  </ContractorRouteGuard>
                </ContractorAuthProvider>
              </ProtectedRoute>
            } />
            
            <Route path="/contractor-jobs" element={
              <ProtectedRoute>
                <ContractorAuthProvider>
                  <ContractorRouteGuard>
                    <ContractorJobs />
                  </ContractorRouteGuard>
                </ContractorAuthProvider>
              </ProtectedRoute>
            } />
            
            <Route path="/contractor-jobs/:id" element={
              <ProtectedRoute>
                <MaintenanceRequestProvider>
                  <ContractorAuthProvider>
                    <ContractorRouteGuard>
                      <ContractorJobDetail />
                    </ContractorRouteGuard>
                  </ContractorAuthProvider>
                </MaintenanceRequestProvider>
              </ProtectedRoute>
            } />
            
            <Route path="/contractor-profile" element={
              <ProtectedRoute>
                <ContractorAuthProvider>
                  <ContractorRouteGuard>
                    <ContractorProfile />
                  </ContractorRouteGuard>
                </ContractorAuthProvider>
              </ProtectedRoute>
            } />
            
            <Route path="/contractor-schedule" element={
              <ProtectedRoute>
                <ContractorAuthProvider>
                  <ContractorRouteGuard>
                    <ContractorSchedule />
                  </ContractorRouteGuard>
                </ContractorAuthProvider>
              </ProtectedRoute>
            } />
            
            <Route path="/contractor-settings" element={
              <ProtectedRoute>
                <ContractorAuthProvider>
                  <ContractorRouteGuard>
                    <ContractorSettings />
                  </ContractorRouteGuard>
                </ContractorAuthProvider>
              </ProtectedRoute>
            } />
            
            <Route path="/contractor-notifications" element={
              <ProtectedRoute>
                <ContractorAuthProvider>
                  <ContractorRouteGuard>
                    <ContractorNotifications />
                  </ContractorRouteGuard>
                </ContractorAuthProvider>
              </ProtectedRoute>
            } />
            
            <Route path="/contractor/quote-submission/:id" element={
              <ProtectedRoute>
                <MaintenanceRequestProvider>
                  <ContractorProvider>
                    <QuoteSubmission />
                  </ContractorProvider>
                </MaintenanceRequestProvider>
              </ProtectedRoute>
            } />

            {/* Billing Page - Standalone billing management */}
            <Route path="/billing" element={
              <ProtectedRoute>
                <OrganizationGuard>
                  <PropertyProvider>
                    <Billing />
                  </PropertyProvider>
                </OrganizationGuard>
              </ProtectedRoute>
            } />

            {/* Billing & Security Settings - Billing for all users, Security for admins */}
            <Route path="/billing-security" element={
              <ProtectedRoute>
                <OrganizationGuard>
                  <PropertyProvider>
                    <AdminSettings />
                  </PropertyProvider>
                </OrganizationGuard>
              </ProtectedRoute>
            } />
            
            {/* Payment Method Setup Page */}
            <Route path="/billing/payment-method" element={
              <ProtectedRoute>
                <OrganizationGuard>
                  <PaymentMethodSetup />
                </OrganizationGuard>
              </ProtectedRoute>
            } />
            
            {/* Team Management - Admin Only */}
            <Route path="/team-management" element={
              <ProtectedRoute>
                <OrganizationGuard>
                  <AdminRouteGuard>
                    <TeamManagement />
                  </AdminRouteGuard>
                </OrganizationGuard>
              </ProtectedRoute>
            } />
            
            {/* 404 route */}
            <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <UnifiedAuthProvider>
          <UserProvider>
            <SubscriptionProvider>
              <Router>
                <div className="App">
                  <AppRoutes />
                </div>
                <Toaster />
              </Router>
            </SubscriptionProvider>
          </UserProvider>
        </UnifiedAuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
