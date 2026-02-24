import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { DeveloperProvider } from './contexts/DeveloperContext'
import { ThemeProvider } from './contexts/ThemeContext'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}
    >
      <ThemeProvider>
        <DeveloperProvider>
          <App />
        </DeveloperProvider>
      </ThemeProvider>
    </BrowserRouter>
  </React.StrictMode>,
)

