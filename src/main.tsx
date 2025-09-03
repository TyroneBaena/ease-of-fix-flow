import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { UserProvider } from './contexts/UserContext'
import { MultiOrganizationProvider } from './contexts/MultiOrganizationContext'

createRoot(document.getElementById("root")!).render(
  <UserProvider>
    <MultiOrganizationProvider>
      <App />
    </MultiOrganizationProvider>
  </UserProvider>
);
