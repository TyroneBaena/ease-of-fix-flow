import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import './auth-debug'; // Force import to trigger debug logs

createRoot(document.getElementById("root")!).render(
  <App />
);
