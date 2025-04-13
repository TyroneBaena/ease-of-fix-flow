
import { Toaster as ShadcnToaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { PropertyProvider } from "./contexts/PropertyContext";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Dashboard from "./pages/Dashboard";
import NewRequest from "./pages/NewRequest";
import AllRequests from "./pages/AllRequests";
import RequestDetail from "./pages/RequestDetail";
import Properties from "./pages/Properties";
import PropertyDetail from "./pages/PropertyDetail";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <ShadcnToaster />
      <SonnerToaster />
      <PropertyProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/new-request" element={<NewRequest />} />
            <Route path="/requests" element={<AllRequests />} />
            <Route path="/requests/:id" element={<RequestDetail />} />
            <Route path="/properties" element={<Properties />} />
            <Route path="/properties/:id" element={<PropertyDetail />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </PropertyProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
