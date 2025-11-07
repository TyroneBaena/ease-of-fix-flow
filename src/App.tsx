// import React from "react";
// import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
// import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
// import { Toaster } from "@/components/ui/sonner";
// import ProtectedRoute from "@/components/ProtectedRoute";
// import OrganizationGuard from "@/components/OrganizationGuard";
// import ErrorBoundary from "@/components/ui/error-boundary";
// import { UnifiedAuthProvider, useSimpleAuth } from "@/contexts/UnifiedAuthContext";
// import { UserProvider } from "@/contexts/UserContext";
// import { Loader2 } from "lucide-react";

// // Import all pages
// import Index from "@/pages/Index";
// import Login from "@/pages/Login";
// import Signup from "@/pages/Signup";
// import SignupStatus from "@/pages/SignupStatus";
// import ForgotPassword from "@/pages/ForgotPassword";
// import SetupPassword from "@/pages/SetupPassword";
// import EmailConfirm from "@/pages/EmailConfirm";
// import Dashboard from "@/pages/Dashboard";
// import AllRequests from "@/pages/AllRequests";
// import NewRequest from "@/pages/NewRequest";
// import RequestDetail from "@/pages/RequestDetail";
// import PublicRequestDetail from "@/pages/PublicRequestDetail";
// import Properties from "@/pages/Properties";
// import PropertyDetail from "@/pages/PropertyDetail";
// import PropertyRequestsView from "@/pages/PropertyRequestsView";
// import PublicPropertyRequests from "@/pages/PublicPropertyRequests";
// import QRCodeRedirect from "@/components/QRCodeRedirect";
// import PublicNewRequestRedirect from "@/components/PublicNewRequestRedirect";
// import PropertyAccess from "@/pages/PropertyAccess";
// import Settings from "@/pages/Settings";
// import Reports from "@/pages/Reports";
// import Notifications from "@/pages/Notifications";
// import NotFound from "@/pages/NotFound";

// // Contractor pages
// import ContractorDashboard from "@/pages/ContractorDashboard";
// import ContractorJobs from "@/pages/contractor/ContractorJobs";
// import ContractorJobDetail from "@/pages/ContractorJobDetail";
// import ContractorProfile from "@/pages/contractor/ContractorProfile";
// import ContractorSchedule from "@/pages/contractor/ContractorSchedule";
// import ContractorSettings from "@/pages/contractor/ContractorSettings";
// import ContractorNotifications from "@/pages/ContractorNotifications";
// import QuoteSubmission from "./pages/contractor/QuoteSubmission";
// import PropertyDetailWrapper from "@/components/PropertyDetailWrapper";
// import NewRequestWrapper from "@/components/NewRequestWrapper";
// import PaymentMethodSetup from "@/pages/PaymentMethodSetup";
// import TestDataFetching from "@/pages/TestDataFetching";

// // Context providers for specific features
// import { SubscriptionProvider } from "./contexts/subscription/SubscriptionContext";
// import { MaintenanceRequestProvider } from "./contexts/maintenance";
// import { PropertyProvider } from "./contexts/property/PropertyContext";
// import { ContractorProvider } from "./contexts/contractor";
// import { ContractorAuthProvider } from "./contexts/contractor/ContractorAuthContext";
// import { ContractorRouteGuard } from "./components/contractor/ContractorRouteGuard";
// import { TabVisibilityProvider } from "./contexts/TabVisibilityContext";

// // New pages
// import Pricing from "@/pages/Pricing";
// import AdminSettings from "@/pages/AdminSettings";
// import { AdminRouteGuard } from "@/components/AdminRouteGuard";
// import { EnhancedSignupFlow } from "@/components/auth/EnhancedSignupFlow";
// import { TeamManagement } from "@/pages/TeamManagement";
// import { TabRevisitDiagnostic } from "@/components/testing/TabRevisitDiagnostic";

// // CRITICAL: Configure QueryClient to work with visibility coordinator
// // Disable aggressive refetching - let coordinator handle background refreshes
// const queryClient = new QueryClient({
//   defaultOptions: {
//     queries: {
//       // Disable automatic refetching - coordinator handles this
//       refetchOnWindowFocus: false,
//       refetchOnMount: false,
//       refetchOnReconnect: false,

//       // Long stale time - data is considered fresh for 5 minutes
//       // Individual queries can override this if needed
//       staleTime: 5 * 60 * 1000, // 5 minutes

//       // Cache data for 10 minutes
//       gcTime: 10 * 60 * 1000, // Renamed from cacheTime in v5

//       // Disable retries by default - let individual queries handle this
//       retry: false,

//       // No automatic background refetching
//       refetchInterval: false,
//     },
//     mutations: {
//       // Mutations should not retry by default
//       retry: false,
//     },
//   },
// });

// function AppRoutes() {
//   const { loading } = useSimpleAuth();
//   const [forceReady, setForceReady] = React.useState(false);

//   // Failsafe: Force app to render after maximum wait time
//   React.useEffect(() => {
//     const failsafeTimer = setTimeout(() => {
//       if (loading && !forceReady) {
//         console.error("⚠️ AppRoutes - Loading timeout exceeded! Forcing app to render.");
//         setForceReady(true);
//       }
//     }, 8000); // 8 second failsafe (reduced from 15s for faster recovery)

//     return () => clearTimeout(failsafeTimer);
//   }, [loading, forceReady]);

//   // Show loading screen while auth is initializing (unless failsafe triggered)
//   if (loading && !forceReady) {
//     return (
//       <div className="min-h-screen flex items-center justify-center">
//         <Loader2 className="h-12 w-12 animate-spin text-blue-500" />
//       </div>
//     );
//   }

//   return (
//     <Routes>
//       {/* Public routes */}
//       <Route path="/" element={<Index />} />
//       <Route path="/pricing" element={<Pricing />} />
//       <Route path="/login" element={<Login />} />
//       <Route path="/signup" element={<Signup />} />
//       <Route path="/signup-status" element={<SignupStatus />} />
//       <Route path="/forgot-password" element={<ForgotPassword />} />
//       <Route path="/setup-password" element={<SetupPassword />} />
//       <Route path="/email-confirm" element={<EmailConfirm />} />

//       {/* Protected routes */}
//       <Route
//         path="/dashboard"
//         element={
//           <ProtectedRoute>
//             <OrganizationGuard>
//               <Dashboard />
//             </OrganizationGuard>
//           </ProtectedRoute>
//         }
//       />

//       <Route
//         path="/requests"
//         element={
//           <ProtectedRoute>
//             <OrganizationGuard>
//               <AllRequests />
//             </OrganizationGuard>
//           </ProtectedRoute>
//         }
//       />

//       <Route path="/new-request" element={<NewRequestWrapper />} />

//       {/* Public request detail route for QR code access */}
//       <Route path="/public-request/:id" element={<PublicRequestDetail />} />

//       <Route
//         path="/requests/:id"
//         element={
//           <ProtectedRoute>
//             <OrganizationGuard>
//               <RequestDetail />
//             </OrganizationGuard>
//           </ProtectedRoute>
//         }
//       />

//       <Route
//         path="/properties"
//         element={
//           <ProtectedRoute>
//             <OrganizationGuard>
//               <Properties />
//             </OrganizationGuard>
//           </ProtectedRoute>
//         }
//       />

//       <Route path="/properties/:id" element={<PropertyDetailWrapper />} />

//       {/* QR code route - validates token and creates temporary session */}
//       <Route path="/qr/:token" element={<QRCodeRedirect />} />

//       {/* Legacy QR code route - for backward compatibility */}
//       <Route path="/property-requests/:id" element={<PublicPropertyRequests />} />

//       {/* Temporary property access route */}
//       <Route path="/property-access/:propertyId" element={<PropertyAccess />} />

//       {/* Public new request route - redirects to login with context */}
//       <Route path="/public-new-request" element={<PublicNewRequestRedirect />} />

//       {/* Private property requests route - requires authentication */}
//       <Route
//         path="/private/property-requests/:id"
//         element={
//           <ProtectedRoute>
//             <OrganizationGuard>
//               <PropertyRequestsView />
//             </OrganizationGuard>
//           </ProtectedRoute>
//         }
//       />

//       {/* Settings route - allow managers but restrict contractor access */}
//       <Route
//         path="/settings"
//         element={
//           <ProtectedRoute>
//             <OrganizationGuard>
//               <Settings />
//             </OrganizationGuard>
//           </ProtectedRoute>
//         }
//       />

//       <Route
//         path="/reports"
//         element={
//           <ProtectedRoute>
//             <OrganizationGuard>
//               <Reports />
//             </OrganizationGuard>
//           </ProtectedRoute>
//         }
//       />

//       <Route
//         path="/notifications"
//         element={
//           <ProtectedRoute>
//             <OrganizationGuard>
//               <Notifications />
//             </OrganizationGuard>
//           </ProtectedRoute>
//         }
//       />

//       {/* Contractor routes */}
//       <Route
//         path="/contractor-dashboard"
//         element={
//           <ProtectedRoute>
//             <ContractorAuthProvider>
//               <ContractorRouteGuard>
//                 <ContractorDashboard />
//               </ContractorRouteGuard>
//             </ContractorAuthProvider>
//           </ProtectedRoute>
//         }
//       />

//       <Route
//         path="/contractor-jobs"
//         element={
//           <ProtectedRoute>
//             <ContractorAuthProvider>
//               <ContractorRouteGuard>
//                 <ContractorJobs />
//               </ContractorRouteGuard>
//             </ContractorAuthProvider>
//           </ProtectedRoute>
//         }
//       />

//       <Route
//         path="/contractor-jobs/:id"
//         element={
//           <ProtectedRoute>
//             <ContractorAuthProvider>
//               <ContractorRouteGuard>
//                 <ContractorJobDetail />
//               </ContractorRouteGuard>
//             </ContractorAuthProvider>
//           </ProtectedRoute>
//         }
//       />

//       <Route
//         path="/contractor-profile"
//         element={
//           <ProtectedRoute>
//             <ContractorAuthProvider>
//               <ContractorRouteGuard>
//                 <ContractorProfile />
//               </ContractorRouteGuard>
//             </ContractorAuthProvider>
//           </ProtectedRoute>
//         }
//       />

//       <Route
//         path="/contractor-schedule"
//         element={
//           <ProtectedRoute>
//             <ContractorAuthProvider>
//               <ContractorRouteGuard>
//                 <ContractorSchedule />
//               </ContractorRouteGuard>
//             </ContractorAuthProvider>
//           </ProtectedRoute>
//         }
//       />

//       <Route
//         path="/contractor-settings"
//         element={
//           <ProtectedRoute>
//             <ContractorAuthProvider>
//               <ContractorRouteGuard>
//                 <ContractorSettings />
//               </ContractorRouteGuard>
//             </ContractorAuthProvider>
//           </ProtectedRoute>
//         }
//       />

//       <Route
//         path="/contractor-notifications"
//         element={
//           <ProtectedRoute>
//             <ContractorAuthProvider>
//               <ContractorRouteGuard>
//                 <ContractorNotifications />
//               </ContractorRouteGuard>
//             </ContractorAuthProvider>
//           </ProtectedRoute>
//         }
//       />

//       <Route
//         path="/contractor/quote-submission/:id"
//         element={
//           <ProtectedRoute>
//             <QuoteSubmission />
//           </ProtectedRoute>
//         }
//       />

//       {/* Billing & Security Settings - Billing for all users, Security for admins */}
//       <Route
//         path="/billing-security"
//         element={
//           <ProtectedRoute>
//             <OrganizationGuard>
//               <AdminSettings />
//             </OrganizationGuard>
//           </ProtectedRoute>
//         }
//       />

//       {/* Payment Method Setup Page */}
//       <Route
//         path="/billing/payment-method"
//         element={
//           <ProtectedRoute>
//             <OrganizationGuard>
//               <PaymentMethodSetup />
//             </OrganizationGuard>
//           </ProtectedRoute>
//         }
//       />

//       {/* Team Management - Admin Only */}
//       <Route
//         path="/team-management"
//         element={
//           <ProtectedRoute>
//             <OrganizationGuard>
//               <AdminRouteGuard>
//                 <TeamManagement />
//               </AdminRouteGuard>
//             </OrganizationGuard>
//           </ProtectedRoute>
//         }
//       />

//       {/* Test Data Fetching Implementation */}
//       <Route
//         path="/test-data-fetching"
//         element={
//           <ProtectedRoute>
//             <TestDataFetching />
//           </ProtectedRoute>
//         }
//       />

//       {/* Tab Revisit Diagnostic Tool */}
//       <Route
//         path="/test-tab-revisit"
//         element={
//           <ProtectedRoute>
//             <div className="min-h-screen bg-background p-8">
//               <TabRevisitDiagnostic />
//             </div>
//           </ProtectedRoute>
//         }
//       />

//       {/* 404 route */}
//       <Route path="*" element={<NotFound />} />
//     </Routes>
//   );
// }

// function App() {
//   return (
//     <ErrorBoundary>
//       <QueryClientProvider client={queryClient}>
//         <TabVisibilityProvider>
//           <UnifiedAuthProvider>
//             <UserProvider>
//               <SubscriptionProvider>
//                 {/* CRITICAL FIX: Move data providers to app level so they persist across route changes */}
//                 <MaintenanceRequestProvider>
//                   <PropertyProvider>
//                     <ContractorProvider>
//                       <Router>
//                         <div className="App">
//                           <AppRoutes />
//                         </div>
//                         <Toaster />
//                       </Router>
//                     </ContractorProvider>
//                   </PropertyProvider>
//                 </MaintenanceRequestProvider>
//               </SubscriptionProvider>
//             </UserProvider>
//           </UnifiedAuthProvider>
//         </TabVisibilityProvider>
//       </QueryClientProvider>
//     </ErrorBoundary>
//   );
// }

// export default App;

// import React from "react";
// import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
// import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
// import { Toaster } from "@/components/ui/sonner";
// import { TabVisibilityProvider } from "@/contexts/TabVisibilityContext";
// import { UnifiedAuthProvider, useSimpleAuth } from "@/contexts/UnifiedAuthContext";
// import { UserProvider } from "@/contexts/UserContext";
// import { SubscriptionProvider } from "@/contexts/subscription/SubscriptionContext";
// import { MaintenanceRequestProvider } from "@/contexts/maintenance";
// import { PropertyProvider } from "@/contexts/property/PropertyContext";
// import { ContractorProvider } from "@/contexts/contractor";
// import ProtectedRoute from "@/components/ProtectedRoute";
// import { OrganizationGuard } from "@/components/routing/OrganizationGuard";
// import ErrorBoundary from "@/components/ui/error-boundary";

// // Your route components
// import Login from "@/pages/Login";
// import Signup from "@/pages/Signup";
// import SignupStatus from "@/pages/SignupStatus";
// import SetupPassword from "@/pages/SetupPassword";
// import Dashboard from "@/pages/Dashboard";
// import Settings from "@/pages/Settings";
// import Properties from "@/pages/Properties";
// import PropertyDetail from "@/pages/PropertyDetail";
// import AllRequests from "@/pages/AllRequests";
// import NewRequest from "@/pages/NewRequest";
// import RequestDetail from "@/pages/RequestDetail";
// import Reports from "@/pages/Reports";
// import NotFound from "@/pages/NotFound";
// import { Loader2 } from "lucide-react";

// // Configure QueryClient to work with visibility coordinator
// const queryClient = new QueryClient({
//   defaultOptions: {
//     queries: {
//       refetchOnWindowFocus: false,
//       refetchOnMount: false,
//       refetchOnReconnect: false,
//       staleTime: 5 * 60 * 1000, // 5 minutes
//       gcTime: 10 * 60 * 1000,
//       retry: false,
//       refetchInterval: false,
//     },
//     mutations: {
//       retry: false,
//     },
//   },
// });

// const AppRoutes = () => {
//   const { currentUser, loading, isInitialized } = useSimpleAuth();

//   // Show a loader until the first auth check is done
//   if (loading && !isInitialized) {
//     return (
//       <div className="flex h-screen w-full items-center justify-center bg-background">
//         <Loader2 className="h-12 w-12 animate-spin text-primary" />
//       </div>
//     );
//   }

//   return (
//     <OrganizationGuard>
//       <Routes>
//         <Route path="/" element={currentUser ? <Navigate to="/dashboard" replace /> : <Navigate to="/login" replace />} />

//         <Route path="/login" element={currentUser ? <Navigate to="/dashboard" replace /> : <Login />} />

//         <Route path="/signup" element={currentUser ? <Navigate to="/dashboard" replace /> : <Signup />} />

//         <Route path="/signup-status" element={<SignupStatus />} />

//         <Route
//           path="/setup-password"
//           element={currentUser ? <Navigate to="/dashboard" replace /> : <SetupPassword />}
//         />

//         <Route
//           path="/dashboard"
//           element={
//             <ProtectedRoute>
//               <Dashboard />
//             </ProtectedRoute>
//           }
//         />

//         <Route
//           path="/properties"
//           element={
//             <ProtectedRoute>
//               <Properties />
//             </ProtectedRoute>
//           }
//         />

//         <Route
//           path="/properties/:id"
//           element={
//             <ProtectedRoute>
//               <PropertyDetail />
//             </ProtectedRoute>
//           }
//         />

//         <Route
//           path="/requests"
//           element={
//             <ProtectedRoute>
//               <AllRequests />
//             </ProtectedRoute>
//           }
//         />

//         <Route
//           path="/new-request"
//           element={
//             <ProtectedRoute>
//               <NewRequest />
//             </ProtectedRoute>
//           }
//         />

//         <Route
//           path="/requests/:id"
//           element={
//             <ProtectedRoute>
//               <RequestDetail />
//             </ProtectedRoute>
//           }
//         />

//         <Route
//           path="/reports"
//           element={
//             <ProtectedRoute>
//               <Reports />
//             </ProtectedRoute>
//           }
//         />

//         <Route
//           path="/settings"
//           element={
//             <ProtectedRoute>
//               <Settings />
//             </ProtectedRoute>
//           }
//         />

//         <Route path="*" element={<NotFound />} />
//       </Routes>
//     </OrganizationGuard>
//   );
// };

// const App: React.FC = () => {
//   return (
//     <ErrorBoundary>
//       <QueryClientProvider client={queryClient}>
//         <BrowserRouter>
//           <TabVisibilityProvider>
//             <UnifiedAuthProvider>
//               <UserProvider>
//                 <SubscriptionProvider>
//                   <MaintenanceRequestProvider>
//                     <PropertyProvider>
//                       <ContractorProvider>
//                         <AppRoutes />
//                         <Toaster />
//                       </ContractorProvider>
//                     </PropertyProvider>
//                   </MaintenanceRequestProvider>
//                 </SubscriptionProvider>
//               </UserProvider>
//             </UnifiedAuthProvider>
//           </TabVisibilityProvider>
//         </BrowserRouter>
//       </QueryClientProvider>
//     </ErrorBoundary>
//   );
// };

// export default App;

// import React, { useEffect, useState } from "react";
// import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
// import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
// import { Toaster } from "@/components/ui/sonner";
// import { TabVisibilityProvider } from "@/contexts/TabVisibilityContext";
// import { UnifiedAuthProvider, useSimpleAuth } from "@/contexts/UnifiedAuthContext";
// import { UserProvider } from "@/contexts/UserContext";
// import { SubscriptionProvider } from "@/contexts/subscription/SubscriptionContext";
// import { MaintenanceRequestProvider } from "@/contexts/maintenance";
// import { PropertyProvider } from "@/contexts/property/PropertyContext";
// import { ContractorProvider } from "@/contexts/contractor";
// import ProtectedRoute from "@/components/ProtectedRoute";
// import { OrganizationGuard } from "@/components/routing/OrganizationGuard";
// import ErrorBoundary from "@/components/ui/error-boundary";
// import { Loader2 } from "lucide-react";

// // ✅ import your Supabase client helpers
// import { createNewSupabaseClient, getSupabaseClient } from "@/integrations/supabase/client";

// // Your route components
// import Login from "@/pages/Login";
// import Signup from "@/pages/Signup";
// import SignupStatus from "@/pages/SignupStatus";
// import SetupPassword from "@/pages/SetupPassword";
// import Dashboard from "@/pages/Dashboard";
// import Settings from "@/pages/Settings";
// import Properties from "@/pages/Properties";
// import PropertyDetail from "@/pages/PropertyDetail";
// import AllRequests from "@/pages/AllRequests";
// import NewRequest from "@/pages/NewRequest";
// import RequestDetail from "@/pages/RequestDetail";
// import Reports from "@/pages/Reports";
// import NotFound from "@/pages/NotFound";

// // ✅ Inline "rehydrateSessionFromServer" helper
// async function rehydrateSessionFromServer(): Promise<boolean> {
//   try {
//     const SESSION_FN = import.meta.env.VITE_SESSION_FN_URL || "/functions/session"; // update if deployed differently
//     const supabase = getSupabaseClient();

//     const res = await fetch(SESSION_FN, {
//       method: "GET",
//       credentials: "include",
//       headers: { Accept: "application/json" },
//     });

//     if (!res.ok) {
//       console.warn("Session function returned", res.status);
//       return false;
//     }

//     const payload = await res.json().catch(() => null);
//     const session = payload?.session || payload?.data?.session || payload?.data || null;

//     if (!session?.access_token || !session?.refresh_token) {
//       console.log("No valid session returned by server");
//       return false;
//     }

//     await supabase.auth.setSession({
//       access_token: session.access_token,
//       refresh_token: session.refresh_token,
//     });

//     try {
//       await supabase.realtime.connect();
//     } catch (e) {
//       console.warn("Realtime connect failed", e);
//     }

//     console.log("✅ Session rehydrated from server");
//     return true;
//   } catch (err) {
//     console.error("Rehydrate error", err);
//     return false;
//   }
// }

// // Query Client setup
// const queryClient = new QueryClient({
//   defaultOptions: {
//     queries: {
//       refetchOnWindowFocus: false,
//       refetchOnMount: false,
//       refetchOnReconnect: false,
//       staleTime: 5 * 60 * 1000,
//       gcTime: 10 * 60 * 1000,
//       retry: false,
//       refetchInterval: false,
//     },
//     mutations: { retry: false },
//   },
// });

// const AppRoutes = () => {
//   const { currentUser, loading, isInitialized } = useSimpleAuth();

//   if (loading && !isInitialized) {
//     return (
//       <div className="flex h-screen w-full items-center justify-center bg-background">
//         <Loader2 className="h-12 w-12 animate-spin text-primary" />
//       </div>
//     );
//   }

//   return (
//     <OrganizationGuard>
//       <Routes>
//         <Route
//           path="/"
//           element={currentUser ? <Navigate to="/dashboard" replace /> : <Navigate to="/login" replace />}
//         />

//         <Route path="/login" element={currentUser ? <Navigate to="/dashboard" replace /> : <Login />} />
//         <Route path="/signup" element={currentUser ? <Navigate to="/dashboard" replace /> : <Signup />} />
//         <Route path="/signup-status" element={<SignupStatus />} />
//         <Route
//           path="/setup-password"
//           element={currentUser ? <Navigate to="/dashboard" replace /> : <SetupPassword />}
//         />

//         <Route
//           path="/dashboard"
//           element={
//             <ProtectedRoute>
//               <Dashboard />
//             </ProtectedRoute>
//           }
//         />

//         <Route
//           path="/properties"
//           element={
//             <ProtectedRoute>
//               <Properties />
//             </ProtectedRoute>
//           }
//         />

//         <Route
//           path="/properties/:id"
//           element={
//             <ProtectedRoute>
//               <PropertyDetail />
//             </ProtectedRoute>
//           }
//         />

//         <Route
//           path="/requests"
//           element={
//             <ProtectedRoute>
//               <AllRequests />
//             </ProtectedRoute>
//           }
//         />

//         <Route
//           path="/new-request"
//           element={
//             <ProtectedRoute>
//               <NewRequest />
//             </ProtectedRoute>
//           }
//         />

//         <Route
//           path="/requests/:id"
//           element={
//             <ProtectedRoute>
//               <RequestDetail />
//             </ProtectedRoute>
//           }
//         />

//         <Route
//           path="/reports"
//           element={
//             <ProtectedRoute>
//               <Reports />
//             </ProtectedRoute>
//           }
//         />

//         <Route
//           path="/settings"
//           element={
//             <ProtectedRoute>
//               <Settings />
//             </ProtectedRoute>
//           }
//         />

//         <Route path="*" element={<NotFound />} />
//       </Routes>
//     </OrganizationGuard>
//   );
// };

// const App: React.FC = () => {
//   const [rehydrated, setRehydrated] = useState(false);

//   useEffect(() => {
//     // 👇 Run rehydration once on mount
//     const doRehydrate = async () => {
//       await rehydrateSessionFromServer();
//       setRehydrated(true);
//     };
//     doRehydrate();
//   }, []);

//   if (!rehydrated) {
//     return (
//       <div className="flex h-screen items-center justify-center bg-background">
//         <Loader2 className="h-10 w-10 animate-spin text-primary" />
//         <p className="ml-2 text-gray-600">Restoring session...</p>
//       </div>
//     );
//   }

//   return (
//     <ErrorBoundary>
//       <QueryClientProvider client={queryClient}>
//         <BrowserRouter>
//           <TabVisibilityProvider>
//             <UnifiedAuthProvider>
//               <UserProvider>
//                 <SubscriptionProvider>
//                   <MaintenanceRequestProvider>
//                     <PropertyProvider>
//                       <ContractorProvider>
//                         <AppRoutes />
//                         <Toaster />
//                       </ContractorProvider>
//                     </PropertyProvider>
//                   </MaintenanceRequestProvider>
//                 </SubscriptionProvider>
//               </UserProvider>
//             </UnifiedAuthProvider>
//           </TabVisibilityProvider>
//         </BrowserRouter>
//       </QueryClientProvider>
//     </ErrorBoundary>
//   );
// };

// export default App;

// src/App.tsx
import React, { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/sonner";
import { TabVisibilityProvider } from "@/contexts/TabVisibilityContext";
import { UnifiedAuthProvider, useSimpleAuth } from "@/contexts/UnifiedAuthContext";
import { UserProvider } from "@/contexts/UserContext";
import { SubscriptionProvider } from "@/contexts/subscription/SubscriptionContext";
import { MaintenanceRequestProvider } from "@/contexts/maintenance";
import { PropertyProvider } from "@/contexts/property/PropertyContext";
import { ContractorProvider } from "@/contexts/contractor";
import ProtectedRoute from "@/components/ProtectedRoute";
import { OrganizationGuard } from "@/components/routing/OrganizationGuard";
import ErrorBoundary from "@/components/ui/error-boundary";
import { Loader2 } from "lucide-react";

// Supabase - use singleton instance only
import { getSupabaseClient, supabase } from "@/integrations/supabase/client";
import { cleanupOldAuthStorage } from "@/utils/cleanupOldAuthStorage";

// Pages
import Login from "@/pages/Login";
import Signup from "@/pages/Signup";
import SignupStatus from "@/pages/SignupStatus";
import ForgotPassword from "@/pages/ForgotPassword";
import SetupPassword from "@/pages/SetupPassword";
import Dashboard from "@/pages/Dashboard";
import Settings from "@/pages/Settings";
import Properties from "@/pages/Properties";
import PropertyDetail from "@/pages/PropertyDetail";
import AllRequests from "@/pages/AllRequests";
import NewRequest from "@/pages/NewRequest";
import RequestDetail from "@/pages/RequestDetail";
import Reports from "@/pages/Reports";
import NotFound from "@/pages/NotFound";

// Import session rehydration utility
import { rehydrateSessionFromServer } from "@/utils/sessionRehydration";

// React Query setup
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      refetchOnReconnect: false,
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
      retry: false,
    },
    mutations: { retry: false },
  },
});

const AppRoutes = () => {
  const { currentUser, loading, isInitialized } = useSimpleAuth();

  if (loading && !isInitialized) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <OrganizationGuard>
      <Routes>
        <Route
          path="/"
          element={currentUser ? <Navigate to="/dashboard" replace /> : <Navigate to="/login" replace />}
        />
        <Route path="/login" element={currentUser ? <Navigate to="/dashboard" replace /> : <Login />} />
        <Route path="/signup" element={currentUser ? <Navigate to="/dashboard" replace /> : <Signup />} />
        <Route path="/signup-status" element={<SignupStatus />} />
        <Route
          path="/forgot-password"
          element={currentUser ? <Navigate to="/dashboard" replace /> : <ForgotPassword />}
        />
        <Route
          path="/setup-password"
          element={currentUser ? <Navigate to="/dashboard" replace /> : <SetupPassword />}
        />

        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
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
          path="/properties/:id"
          element={
            <ProtectedRoute>
              <PropertyDetail />
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
        <Route
          path="/new-request"
          element={
            <ProtectedRoute>
              <NewRequest />
            </ProtectedRoute>
          }
        />
        <Route
          path="/requests/:id"
          element={
            <ProtectedRoute>
              <RequestDetail />
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
        <Route path="*" element={<NotFound />} />
      </Routes>
    </OrganizationGuard>
  );
};

const App: React.FC = () => {
  const [rehydrated, setRehydrated] = useState(false);

  // ONLY initial load rehydration - tab revisits handled by visibilityCoordinator v41.1
  useEffect(() => {
    console.log("🔧 App.tsx v41.1 - Initial load rehydration");
    // Clean up old v37 storage first
    cleanupOldAuthStorage();
    // Then rehydrate from HttpOnly cookies ONCE on initial load
    rehydrateSessionFromServer().then(() => setRehydrated(true));
  }, []);

  if (!rehydrated) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="ml-3 text-lg text-gray-600">Restoring session...</p>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <UnifiedAuthProvider>
            <TabVisibilityProvider>
              <UserProvider>
                <SubscriptionProvider>
                  <MaintenanceRequestProvider>
                    <PropertyProvider>
                      <ContractorProvider>
                        <AppRoutes />
                        <Toaster />
                      </ContractorProvider>
                    </PropertyProvider>
                  </MaintenanceRequestProvider>
                </SubscriptionProvider>
              </UserProvider>
            </TabVisibilityProvider>
          </UnifiedAuthProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

export default App;
