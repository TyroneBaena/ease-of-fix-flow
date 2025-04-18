
import { Toaster as ShadcnToaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { PropertyProvider } from "./contexts/property/PropertyContext";
import { MaintenanceRequestProvider } from "./contexts/maintenance/MaintenanceRequestContext";
import { UserProvider } from "./contexts/UserContext";
import { ContractorProvider } from "./contexts/contractor/ContractorContext";
import Index from "./pages/Index";
import Login from "./pages/Login";
import ForgotPassword from "./pages/ForgotPassword";
import SetupPassword from "./pages/SetupPassword";
import NotFound from "./pages/NotFound";
import Dashboard from "./pages/Dashboard";
import NewRequest from "./pages/NewRequest";
import AllRequests from "./pages/AllRequests";
import RequestDetail from "./pages/RequestDetail";
import Properties from "./pages/Properties";
import PropertyDetail from "./pages/PropertyDetail";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";
import ContractorDashboard from "./pages/ContractorDashboard";
import ProtectedRoute from "./components/ProtectedRoute";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <ShadcnToaster />
      <SonnerToaster />
      <UserProvider>
        <PropertyProvider>
          <MaintenanceRequestProvider>
            <ContractorProvider>
              <BrowserRouter>
                <Routes>
                  <Route path="/" element={<Index />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/forgot-password" element={<ForgotPassword />} />
                  <Route path="/setup-password" element={<SetupPassword />} />
                  
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
                  <Route path="/requests" element={
                    <ProtectedRoute>
                      <AllRequests />
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
                  <Route path="/reports" element={
                    <ProtectedRoute>
                      <Reports />
                    </ProtectedRoute>
                  } />
                  <Route path="/settings" element={
                    <ProtectedRoute requireAdmin={true} allowManager={true}>
                      <Settings />
                    </ProtectedRoute>
                  } />
                  <Route path="/contractor-dashboard" element={
                    <ProtectedRoute>
                      <ContractorDashboard />
                    </ProtectedRoute>
                  } />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </BrowserRouter>
            </ContractorProvider>
          </MaintenanceRequestProvider>
        </PropertyProvider>
      </UserProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
