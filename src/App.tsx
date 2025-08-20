
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
                <Dashboard />
              </ProtectedRoute>
            } />
            
            <Route path="/requests" element={
              <ProtectedRoute>
                <AllRequests />
              </ProtectedRoute>
            } />
            
            <Route path="/new-request" element={
              <ProtectedRoute>
                <NewRequest />
              </ProtectedRoute>
            } />
            
            <Route path="/requests/:id" element={
              <ProtectedRoute>
                <RequestDetail />
              </ProtectedRoute>
            } />
            
            <Route path="/properties" element={
              <ProtectedRoute>
                <Properties />
              </ProtectedRoute>
            } />
            
            <Route path="/properties/:id" element={
              <ProtectedRoute>
                <PropertyDetail />
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
                <ContractorDashboard />
              </ProtectedRoute>
            } />
            
            <Route path="/contractor-jobs" element={
              <ProtectedRoute>
                <ContractorJobs />
              </ProtectedRoute>
            } />
            
            <Route path="/contractor-jobs/:id" element={
              <ProtectedRoute>
                <ContractorJobDetail />
              </ProtectedRoute>
            } />
            
            <Route path="/contractor-profile" element={
              <ProtectedRoute>
                <ContractorProfile />
              </ProtectedRoute>
            } />
            
            <Route path="/contractor-schedule" element={
              <ProtectedRoute>
                <ContractorSchedule />
              </ProtectedRoute>
            } />
            
            <Route path="/contractor-settings" element={
              <ProtectedRoute>
                <ContractorSettings />
              </ProtectedRoute>
            } />
            
            <Route path="/contractor-notifications" element={
              <ProtectedRoute>
                <ContractorNotifications />
              </ProtectedRoute>
            } />
            
            <Route path="/contractor/quote-submission/:id" element={
              <ProtectedRoute>
                <QuoteSubmission />
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
