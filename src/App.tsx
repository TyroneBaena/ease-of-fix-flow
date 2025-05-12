
import React, { useEffect, useState } from 'react';
import {
  BrowserRouter as Router,
  Route,
  Routes,
  Navigate,
} from 'react-router-dom';
import Login from './pages/Login';
import ForgotPassword from './pages/ForgotPassword';
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

  return (
    <Router>
      <Routes>
        <Route path="/login" element={currentUser ? <Navigate to="/dashboard" /> : <Login />} />
        <Route path="/forgot-password" element={currentUser ? <Navigate to="/dashboard" /> : <ForgotPassword />} />
        
        <Route path="/dashboard" element={
          <ProtectedRoute>
            <Dashboard />
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
        
        <Route path="/contractor-dashboard" element={
          <ProtectedRoute>
            <ContractorDashboard />
          </ProtectedRoute>
        } />
        
        <Route path="/contractor-jobs/:id" element={
          <ProtectedRoute>
            <ContractorJobDetail />
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
        
        <Route path="/" element={currentUser ? <Navigate to="/dashboard" /> : <Navigate to="/login" />} />
      </Routes>
    </Router>
  );
};

export default App;
