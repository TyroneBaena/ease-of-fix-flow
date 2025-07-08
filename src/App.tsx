
import { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useParams } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { UserProvider } from '@/contexts/UserContext';
import { PropertyProvider } from '@/contexts/property';
import { MaintenanceRequestProvider } from '@/contexts/maintenance';
import ProtectedRoute from '@/components/ProtectedRoute';
import './App.css';

// Lazy load components
const Index = lazy(() => import('@/pages/Index'));
const Login = lazy(() => import('@/pages/Login'));
const Signup = lazy(() => import('@/pages/Signup'));
const ForgotPassword = lazy(() => import('@/pages/ForgotPassword'));
const SetupPassword = lazy(() => import('@/pages/SetupPassword'));
const Dashboard = lazy(() => import('@/pages/Dashboard'));
const AllRequests = lazy(() => import('@/pages/AllRequests'));
const NewRequest = lazy(() => import('@/pages/NewRequest'));
const RequestDetail = lazy(() => import('@/pages/RequestDetail'));
const QuoteRequest = lazy(() => import('@/pages/QuoteRequest'));
const Properties = lazy(() => import('@/pages/Properties'));
const PropertyDetail = lazy(() => import('@/pages/PropertyDetail'));
const Reports = lazy(() => import('@/pages/Reports'));
const Settings = lazy(() => import('@/pages/Settings'));
const Notifications = lazy(() => import('@/pages/Notifications'));
const NotFound = lazy(() => import('@/pages/NotFound'));
const ContractorDashboard = lazy(() => import('@/pages/ContractorDashboard'));
const ContractorJobDetail = lazy(() => import('@/pages/ContractorJobDetail'));
const ContractorNotifications = lazy(() => import('@/pages/ContractorNotifications'));
const QuoteSubmission = lazy(() => import('@/pages/contractor/QuoteSubmission'));
const ContractorJobs = lazy(() => import('@/pages/contractor/ContractorJobs'));
const ContractorProfile = lazy(() => import('@/pages/contractor/ContractorProfile'));
const ContractorSchedule = lazy(() => import('@/pages/contractor/ContractorSchedule'));
const ContractorSettings = lazy(() => import('@/pages/contractor/ContractorSettings'));
const ScheduledTimeline = lazy(() => import('@/pages/admin/ScheduledTimeline'));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// Component to handle redirect with parameter
const RequestsRedirect = () => {
  const { id } = useParams();
  return <Navigate to={`/request/${id}`} replace />;
};

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <UserProvider>
        <PropertyProvider>
          <MaintenanceRequestProvider>
            <Router>
              <Suspense fallback={<div>Loading...</div>}>
                <Routes>
                  <Route path="/" element={<Index />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/signup" element={<Signup />} />
                  <Route path="/forgot-password" element={<ForgotPassword />} />
                  <Route path="/setup-password" element={<SetupPassword />} />
                  
                  <Route 
                    path="/dashboard" 
                    element={
                      <ProtectedRoute>
                        <Dashboard />
                      </ProtectedRoute>
                    } 
                  />
                  
                  <Route 
                    path="/requests" 
                    element={
                      <ProtectedRoute>
                        <AllRequests />
                      </ProtectedRoute>
                    } 
                  />
                  
                  {/* Add redirect for plural requests to singular request */}
                  <Route 
                    path="/requests/:id" 
                    element={<RequestsRedirect />}
                  />
                  
                  <Route 
                    path="/request/new" 
                    element={
                      <ProtectedRoute>
                        <NewRequest />
                      </ProtectedRoute>
                    } 
                  />
                  
                  <Route 
                    path="/request/:id" 
                    element={
                      <ProtectedRoute>
                        <RequestDetail />
                      </ProtectedRoute>
                    } 
                  />
                  
                  <Route 
                    path="/request/:id/quote-request" 
                    element={
                      <ProtectedRoute>
                        <QuoteRequest />
                      </ProtectedRoute>
                    } 
                  />
                  
                  <Route 
                    path="/properties" 
                    element={
                      <ProtectedRoute>
                        <Properties />
                      </ProtectedRoute>
                    } 
                  />
                  
                  <Route 
                    path="/property/:id" 
                    element={
                      <ProtectedRoute>
                        <PropertyDetail />
                      </ProtectedRoute>
                    } 
                  />
                  
                  <Route 
                    path="/reports" 
                    element={
                      <ProtectedRoute>
                        <Reports />
                      </ProtectedRoute>
                    } 
                  />
                  
                  <Route 
                    path="/settings" 
                    element={
                      <ProtectedRoute>
                        <Settings />
                      </ProtectedRoute>
                    } 
                  />
                  
                  <Route 
                    path="/notifications" 
                    element={
                      <ProtectedRoute>
                        <Notifications />
                      </ProtectedRoute>
                    } 
                  />
                  
                  <Route 
                    path="/contractor-dashboard" 
                    element={
                      <ProtectedRoute>
                        <ContractorDashboard />
                      </ProtectedRoute>
                    } 
                  />
                  
                  <Route 
                    path="/contractor/job/:id" 
                    element={
                      <ProtectedRoute>
                        <ContractorJobDetail />
                      </ProtectedRoute>
                    } 
                  />
                  
                  <Route 
                    path="/contractor/notifications" 
                    element={
                      <ProtectedRoute>
                        <ContractorNotifications />
                      </ProtectedRoute>
                    } 
                  />
                  
                  <Route 
                    path="/contractor/quote/:id" 
                    element={
                      <ProtectedRoute>
                        <QuoteSubmission />
                      </ProtectedRoute>
                    } 
                  />
                  
                  <Route 
                    path="/contractor/jobs" 
                    element={
                      <ProtectedRoute>
                        <ContractorJobs />
                      </ProtectedRoute>
                    } 
                  />
                  
                  <Route 
                    path="/contractor/profile" 
                    element={
                      <ProtectedRoute>
                        <ContractorProfile />
                      </ProtectedRoute>
                    } 
                  />
                  
                  <Route 
                    path="/contractor/schedule" 
                    element={
                      <ProtectedRoute>
                        <ContractorSchedule />
                      </ProtectedRoute>
                    } 
                  />
                  
                  <Route 
                    path="/contractor/settings" 
                    element={
                      <ProtectedRoute>
                        <ContractorSettings />
                      </ProtectedRoute>
                    } 
                  />
                  
                  <Route 
                    path="/admin/scheduled-timeline" 
                    element={
                      <ProtectedRoute>
                        <ScheduledTimeline />
                      </ProtectedRoute>
                    } 
                  />
                  
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
            </Router>
          </MaintenanceRequestProvider>
        </PropertyProvider>
      </UserProvider>
    </QueryClientProvider>
  );
}

export default App;
