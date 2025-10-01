import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/sonner';
import ProtectedRoute from '@/components/ProtectedRoute';
import OrganizationGuard from '@/components/OrganizationGuard';
import ErrorBoundary from '@/components/ui/error-boundary';
import { UnifiedAuthProvider } from '@/contexts/UnifiedAuthContext';
import { UserProvider } from '@/contexts/UserContext';

// Import all pages
import Index from '@/pages/Index';
import Login from '@/pages/Login';
import Signup from '@/pages/Signup';
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

// Context providers for specific features
import { SubscriptionProvider } from './contexts/subscription/SubscriptionContext';
import { MaintenanceRequestProvider } from './contexts/maintenance';
import { PropertyProvider } from './contexts/property/PropertyContext';
import { ContractorProvider } from './contexts/contractor';
import { ContractorAuthProvider } from './contexts/contractor/ContractorAuthContext';
import { ContractorRouteGuard } from './components/contractor/ContractorRouteGuard';

// New pages
import Pricing from '@/pages/Pricing';
import Billing from '@/pages/Billing';
import Security from '@/pages/Security';
import { BillingManagePage } from '@/components/billing/BillingManagePage';
import { EnhancedSignupFlow } from '@/components/auth/EnhancedSignupFlow';

const queryClient = new QueryClient();

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <UnifiedAuthProvider>
          <UserProvider>
        <Router>
          <div className="App">
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<Index />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<EnhancedSignupFlow />} />
            <Route path="/signup-basic" element={<Signup />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/setup-password" element={<SetupPassword />} />
            <Route path="/email-confirm" element={<EmailConfirm />} />
            
            {/* Protected routes */}
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <OrganizationGuard>
                  <SubscriptionProvider>
                    <MaintenanceRequestProvider>
                      <PropertyProvider>
                        <Dashboard />
                      </PropertyProvider>
                    </MaintenanceRequestProvider>
                  </SubscriptionProvider>
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
            
            <Routexxxx path="/new-request" element={<NewRequestWrapper />} />
            
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
                  <SubscriptionProvider>
                    <PropertyProvider>
                      <Properties />
                    </PropertyProvider>
                  </SubscriptionProvider>
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

            {/* Security Dashboard (admin only) */}
            <Route path="/security" element={
              <ProtectedRoute>
                <OrganizationGuard>
                  <Security />
                </OrganizationGuard>
              </ProtectedRoute>
            } />

            {/* Billing (protected) */}
            <Route path="/billing" element={
              <ProtectedRoute>
                <OrganizationGuard>
                  <Billing />
                </OrganizationGuard>
              </ProtectedRoute>
            } />
            <Route path="/billing/manage" element={
              <ProtectedRoute>
                <OrganizationGuard>
                  <SubscriptionProvider>
                    <PropertyProvider>
                      <BillingManagePage />
                    </PropertyProvider>
                  </SubscriptionProvider>
                </OrganizationGuard>
              </ProtectedRoute>
            } />
            
            {/* 404 route */}
            <Route path="*" element={<NotFound />} />
          </Routes>
          </div>
          <Toaster />
        </Router>
          </UserProvider>
        </UnifiedAuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
