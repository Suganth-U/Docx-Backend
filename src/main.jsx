import React, { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import "@/index.css";
import App from "@/App.jsx"

import { GoogleOAuthProvider } from '@react-oauth/google';
import { AuthProvider } from "@/shared/context/AuthProvider.jsx";

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <GoogleOAuthProvider clientId="YOUR_CLIENT_ID">
      <AuthProvider>
        <App />
      </AuthProvider>
    </GoogleOAuthProvider>
  </StrictMode>,
)
