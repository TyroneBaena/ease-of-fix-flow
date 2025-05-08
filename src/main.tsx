
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { UserProvider } from './contexts/UserContext'
import { MaintenanceRequestProvider } from './contexts/maintenance'
import { PropertyProvider } from './contexts/property/PropertyContext'

createRoot(document.getElementById("root")!).render(
  <UserProvider>
    <MaintenanceRequestProvider>
      <PropertyProvider>
        <App />
      </PropertyProvider>
    </MaintenanceRequestProvider>
  </UserProvider>
);
