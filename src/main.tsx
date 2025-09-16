import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { SimpleAuthProvider } from './contexts/SimpleAuthContext'
import { UserProvider } from './contexts/UserContext'

createRoot(document.getElementById("root")!).render(
  <SimpleAuthProvider>
    <UserProvider>
      <App />
    </UserProvider>
  </SimpleAuthProvider>
);
