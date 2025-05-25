import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { AuthProvider } from '@asgardeo/auth-react'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
     <AuthProvider
      config={ {
        signInRedirectURL: 'http://localhost:5173',
        signOutRedirectURL: 'http://localhost:5173',
        clientID: 'iYt9lvROrGJ_0E2M5gSqNp5PjEUa',
        baseUrl: 'https://api.asgardeo.io/t/pavinduorg',
        scope: ['openid', 'profile'],
      } }
    >
      <App />
    </AuthProvider>
  </StrictMode>
)
