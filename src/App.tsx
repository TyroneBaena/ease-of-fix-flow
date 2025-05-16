
import React, { useEffect, useState } from 'react';
import {
  BrowserRouter as Router,
  Route,
  Routes,
  Navigate,
} from 'react-router-dom';
import Login from './pages/Login';
import ForgotPassword from './pages/ForgotPassword';
import SetupPassword from './pages/SetupPassword';
import Dashboard from './pages/Dashboard';
import NewRequest from './pages/NewRequest';
import { useUserContext } from './contexts/UserContext';
import { Loader2 } from 'lucide-react';
import RequestDetail from './pages/RequestDetail';
import Reports from './pages/Reports';
import ContractorDashboard from './pages/ContractorDashboard';
import ContractorJobDetail from './pages/ContractorJobDetail';
import Properties from './pages/Properties';
import PropertyDetail from './pages/PropertyDetail';
import AllRequests from './pages/AllRequests';
import Settings from './pages/Settings';
import ProtectedRoute from './components/ProtectedRoute';
import ContractorJobs from './pages/contractor/ContractorJobs';
import ContractorSchedule from './pages/contractor/ContractorSchedule';
import ContractorProfile from './pages/contractor/ContractorProfile';
import ContractorSettings from './pages/contractor/ContractorSettings';
import Index from './pages/Index';
import Signup from './pages/Signup';
import Notifications from './pages/Notifications';

const App = () => {
  const { currentUser, loading } = useUserContext();
  const [isFirstLoad, setIsFirstLoad] = useState(true);

  useEffect(() => {
    if (!loading && isFirstLoad) {
      setIsFirstLoad(false);
    }
  }, [loading, isFirstLoad]);

  if (loading && isFirstLoad) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-10 w-10 animate-spin text-blue-500" />
      </div>
    );
  }

  // Helper function to determine home route based on user role
  const getHomeRoute = () => {
    if (!currentUser) return "/login";
    
    if (currentUser.role === 'contractor') {
      return "/contractor-dashboard";
    }
    
    return "/dashboard";
  };

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Index />} />
        
        <Route path="/signup" element={<Signup />} />
        
        <Route path="/login" element={currentUser ? <Navigate to={getHomeRoute()} /> : <Login />} />
        <Route path="/forgot-password" element={currentUser ? <Navigate to={getHomeRoute()} /> : <ForgotPassword />} />
        <Route path="/setup-password" element={<SetupPassword />} />
        
        {/* Admin/Manager Routes */}
        <Route path="/dashboard" element={
          <ProtectedRoute>
            {currentUser?.role === 'contractor' ? 
              <Navigate to="/contractor-dashboard" replace /> : 
              <Dashboard />
            }
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
        
        <Route path="/requests" element={
          <ProtectedRoute>
            <AllRequests />
          </ProtectedRoute>
        } />
        
        <Route path="/reports" element={
          <ProtectedRoute>
            <Reports />
          </ProtectedRoute>
        } />
        
        <Route path="/settings" element={
          <ProtectedRoute>
            <Settings />
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
        
        <Route path="/notifications" element={
          <ProtectedRoute>
            <Notifications />
          </ProtectedRoute>
        } />
        
        {/* Contractor Routes */}
        <Route path="/contractor-dashboard" element={
          <ProtectedRoute>
            {currentUser?.role !== 'contractor' ? 
              <Navigate to="/dashboard" replace /> : 
              <ContractorDashboard />
            }
          </ProtectedRoute>
        } />
        
        <Route path="/contractor-jobs/:id" element={
          <ProtectedRoute>
            <ContractorJobDetail />
          </ProtectedRoute>
        } />
        
        <Route path="/contractor-jobs" element={
          <ProtectedRoute>
            <ContractorJobs />
          </ProtectedRoute>
        } />
        
        <Route path="/contractor-schedule" element={
          <ProtectedRoute>
            <ContractorSchedule />
          </ProtectedRoute>
        } />
        
        <Route path="/contractor-profile" element={
          <ProtectedRoute>
            <ContractorProfile />
          </ProtectedRoute>
        } />
        
        <Route path="/contractor-settings" element={
          <ProtectedRoute>
            <ContractorSettings />
          </ProtectedRoute>
        } />
        
        <Route path="/" element={currentUser ? <Navigate to={getHomeRoute()} /> : <Navigate to="/login" />} />
      </Routes>
    </Router>
  );
};

export default App;
