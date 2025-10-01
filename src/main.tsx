import { createRoot } from 'react-dom/client'
import * as Sentry from '@sentry/react';
import App from './App.tsx'
import './index.css'
import './auth-debug'; // Force import to trigger debug logs
import { initSentry } from './lib/sentry';

// Initialize Sentry before rendering
initSentry();

createRoot(document.getElementById("root")!).render(
  <App />
);
