
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

  const routes = [
    {
      path: "/login",
      element: currentUser ? <Navigate to="/dashboard" /> : <Login />,
    },
    {
      path: "/forgot-password",
      element: currentUser ? <Navigate to="/dashboard" /> : <ForgotPassword />,
    },
    {
      path: "/dashboard",
      element: currentUser ? <Dashboard /> : <Navigate to="/login" />,
    },
    {
      path: "/new-request",
      element: currentUser ? <NewRequest /> : <Navigate to="/login" />,
    },
    {
      path: "/requests/:id",
      element: currentUser ? <RequestDetail /> : <Navigate to="/login" />,
    },
    {
      path: "/reports",
      element: currentUser ? <Reports /> : <Navigate to="/login" />,
    },
    {
      path: "/contractor-dashboard",
      element: <ContractorDashboard />,
    },
    {
      path: "/contractor-jobs/:id",
      element: <ContractorJobDetail />,
    },
    {
      path: "/properties",
      element: currentUser ? <Properties /> : <Navigate to="/login" />,
    },
    {
      path: "/properties/:id",
      element: currentUser ? <PropertyDetail /> : <Navigate to="/login" />,
    },
    {
      path: "/",
      element: currentUser ? <Navigate to="/dashboard" /> : <Navigate to="/login" />,
    },
  ];

  return (
    <Router>
      <Routes>
        {routes.map((route, index) => (
          <Route key={index} path={route.path} element={route.element} />
        ))}
      </Routes>
    </Router>
  );
};

export default App;
