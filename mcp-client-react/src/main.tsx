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
        clientID: 'cmvfMf9FihCr2JFrybf6AQGVd2Ma',
        baseUrl: 'https://dev.api.asgardeo.io/t/pavindu119',
        scope: ['openid', 'profile'],
        storage: "sessionStorage"
      } }
    >
      <App />
    </AuthProvider>
  </StrictMode>
)
