
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/sonner';
import ProtectedRoute from '@/components/ProtectedRoute';

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
import Properties from '@/pages/Properties';
import PropertyDetail from '@/pages/PropertyDetail';
import PropertyRequestsView from '@/pages/PropertyRequestsView';
import PublicPropertyRequestsView from '@/pages/PublicPropertyRequestsView';
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

// Context providers for specific features
import { SubscriptionProvider } from './contexts/subscription/SubscriptionContext';
import { MaintenanceRequestProvider } from './contexts/maintenance';
import { PropertyProvider } from './contexts/property/PropertyContext';
import { ContractorProvider } from './contexts/contractor';

// New pages
import Pricing from '@/pages/Pricing';
import Billing from '@/pages/Billing';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <div className="App">
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<Index />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/setup-password" element={<SetupPassword />} />
            <Route path="/email-confirm" element={<EmailConfirm />} />
            
            {/* Protected routes */}
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <SubscriptionProvider>
                  <MaintenanceRequestProvider>
                    <PropertyProvider>
                      <Dashboard />
                    </PropertyProvider>
                  </MaintenanceRequestProvider>
                </SubscriptionProvider>
              </ProtectedRoute>
            } />
            
            <Route path="/requests" element={
              <ProtectedRoute>
                <MaintenanceRequestProvider>
                  <ContractorProvider>
                    <AllRequests />
                  </ContractorProvider>
                </MaintenanceRequestProvider>
              </ProtectedRoute>
            } />
            
            <Route path="/new-request" element={
              <ProtectedRoute>
                <MaintenanceRequestProvider>
                  <PropertyProvider>
                    <NewRequest />
                  </PropertyProvider>
                </MaintenanceRequestProvider>
              </ProtectedRoute>
            } />
            
            <Route path="/requests/:id" element={
              <ProtectedRoute>
                <MaintenanceRequestProvider>
                  <ContractorProvider>
                    <RequestDetail />
                  </ContractorProvider>
                </MaintenanceRequestProvider>
              </ProtectedRoute>
            } />
            
            <Route path="/properties" element={
              <ProtectedRoute>
                <PropertyProvider>
                  <Properties />
                </PropertyProvider>
              </ProtectedRoute>
            } />
            
            <Route path="/properties/:id" element={
              <ProtectedRoute>
                <PropertyProvider>
                  <MaintenanceRequestProvider>
                    <PropertyDetail />
                  </MaintenanceRequestProvider>
                </PropertyProvider>
              </ProtectedRoute>
            } />
            
            {/* Public QR code route - no authentication required */}
            <Route path="/property-requests/:id" element={<PublicPropertyRequestsView />} />
            
            {/* Private property requests route - requires authentication */}
            <Route path="/private/property-requests/:id" element={
              <ProtectedRoute>
                <PropertyRequestsView />
              </ProtectedRoute>
            } />
            
            {/* Settings route - allow managers but restrict contractor access */}
            <Route path="/settings" element={
              <ProtectedRoute>
                <Settings />
              </ProtectedRoute>
            } />
            
            <Route path="/reports" element={
              <ProtectedRoute>
                <Reports />
              </ProtectedRoute>
            } />
            
            <Route path="/notifications" element={
              <ProtectedRoute>
                <Notifications />
              </ProtectedRoute>
            } />
            
            {/* Contractor routes */}
            <Route path="/contractor-dashboard" element={
              <ProtectedRoute>
                <ContractorProvider>
                  <ContractorDashboard />
                </ContractorProvider>
              </ProtectedRoute>
            } />
            
            <Route path="/contractor-jobs" element={
              <ProtectedRoute>
                <ContractorProvider>
                  <ContractorJobs />
                </ContractorProvider>
              </ProtectedRoute>
            } />
            
            <Route path="/contractor-jobs/:id" element={
              <ProtectedRoute>
                <ContractorProvider>
                  <ContractorJobDetail />
                </ContractorProvider>
              </ProtectedRoute>
            } />
            
            <Route path="/contractor-profile" element={
              <ProtectedRoute>
                <ContractorProvider>
                  <ContractorProfile />
                </ContractorProvider>
              </ProtectedRoute>
            } />
            
            <Route path="/contractor-schedule" element={
              <ProtectedRoute>
                <ContractorProvider>
                  <ContractorSchedule />
                </ContractorProvider>
              </ProtectedRoute>
            } />
            
            <Route path="/contractor-settings" element={
              <ProtectedRoute>
                <ContractorProvider>
                  <ContractorSettings />
                </ContractorProvider>
              </ProtectedRoute>
            } />
            
            <Route path="/contractor-notifications" element={
              <ProtectedRoute>
                <ContractorProvider>
                  <ContractorNotifications />
                </ContractorProvider>
              </ProtectedRoute>
            } />
            
            <Route path="/contractor/quote-submission/:id" element={
              <ProtectedRoute>
                <ContractorProvider>
                  <QuoteSubmission />
                </ContractorProvider>
              </ProtectedRoute>
            } />

            {/* Billing (protected) */}
            <Route path="/billing" element={
              <ProtectedRoute>
                <Billing />
              </ProtectedRoute>
            } />
            
            {/* 404 route */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </div>
        <Toaster />
      </Router>
    </QueryClientProvider>
  );
}

export default App;
