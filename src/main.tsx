
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { UserProvider } from './contexts/UserContext'
import { MaintenanceRequestProvider } from './contexts/maintenance'

createRoot(document.getElementById("root")!).render(
  <UserProvider>
    <MaintenanceRequestProvider>
      <App />
    </MaintenanceRequestProvider>
  </UserProvider>
);
