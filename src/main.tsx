import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { UserProvider } from './contexts/UserContext'
import { SubscriptionProvider } from './contexts/subscription/SubscriptionContext'
import { MaintenanceRequestProvider } from './contexts/maintenance'
import { PropertyProvider } from './contexts/property/PropertyContext'
import { ContractorProvider } from './contexts/contractor'

createRoot(document.getElementById("root")!).render(
  <UserProvider>
    <SubscriptionProvider>
      <MaintenanceRequestProvider>
        <PropertyProvider>
          <ContractorProvider>
            <App />
          </ContractorProvider>
        </PropertyProvider>
      </MaintenanceRequestProvider>
    </SubscriptionProvider>
  </UserProvider>
);
