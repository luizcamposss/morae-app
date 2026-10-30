import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { AuthProvider } from "./app/providers/AuthProvider";
import { CondominiumProvider } from "./app/providers/CondominiumProvider";
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <CondominiumProvider>
        <App />
      </CondominiumProvider>
    </AuthProvider>
  </StrictMode>
)
