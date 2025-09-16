import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { SimpleAuthProvider } from './contexts/SimpleAuthContext'

createRoot(document.getElementById("root")!).render(
  <SimpleAuthProvider>
    <App />
  </SimpleAuthProvider>
);
