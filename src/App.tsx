
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/sonner';
import { UserProvider } from '@/contexts/UserContext';
import { PropertyProvider } from '@/contexts/property';
import { MaintenanceRequestProvider } from '@/contexts/maintenance';
import { ContractorProvider } from '@/contexts/contractor';
import ProtectedRoute from '@/components/ProtectedRoute';

// Import all pages
import Index from '@/pages/Index';
import Login from '@/pages/Login';
import Signup from '@/pages/Signup';
import ForgotPassword from '@/pages/ForgotPassword';
import SetupPassword from '@/pages/SetupPassword';
import Dashboard from '@/pages/Dashboard';
import AllRequests from '@/pages/AllRequests';
import NewRequest from '@/pages/NewRequest';
import RequestDetail from '@/pages/RequestDetail';
import Properties from '@/pages/Properties';
import PropertyDetail from '@/pages/PropertyDetail';
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

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <UserProvider>
        <PropertyProvider>
          <MaintenanceRequestProvider>
            <ContractorProvider>
              <Router>
                <div className="App">
                  <Routes>
                    {/* Public routes */}
                    <Route path="/" element={<Index />} />
                    <Route path="/login" element={<Login />} />
                    <Route path="/signup" element={<Signup />} />
                    <Route path="/forgot-password" element={<ForgotPassword />} />
                    <Route path="/setup-password" element={<SetupPassword />} />
                    
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
                    
                    <Route path="/request/:id" element={
                      <ProtectedRoute>
                        <RequestDetail />
                      </ProtectedRoute>
                    } />
                    
                    <Route path="/properties" element={
                      <ProtectedRoute>
                        <Properties />
                      </ProtectedRoute>
                    } />
                    
                    <Route path="/property/:id" element={
                      <ProtectedRoute>
                        <PropertyDetail />
                      </ProtectedRoute>
                    } />
                    
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
                    
                    <Route path="/contractor-job/:id" element={
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
                    
                    {/* 404 route */}
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </div>
                <Toaster />
              </Router>
            </ContractorProvider>
          </MaintenanceRequestProvider>
        </PropertyProvider>
      </UserProvider>
    </QueryClientProvider>
  );
}

export default App;
