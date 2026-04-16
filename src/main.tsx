import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { AuthProvider } from './contexts/AuthContext.tsx'
import { ErrorBoundary } from './components/ErrorBoundary.tsx'

// NOTE: StrictMode is intentionally removed — React 18 StrictMode double-mounts
// cause Supabase's auth lock to be orphaned, resulting in "stuck on Loading" after
// Google OAuth redirect. This has no effect on production builds.
createRoot(document.getElementById('root')!).render(
  <ErrorBoundary>
    <AuthProvider>
      <App />
    </AuthProvider>
  </ErrorBoundary>,
)
