import { lazy, Suspense } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';

import { AuthProvider } from '@/components/auth/AuthProvider';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { RTLWrapper } from '@/components/common/RTLWrapper';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { CommandPaletteProvider } from '@/components/common/CommandPalette';

import Landing from '@/pages/Landing';
import Login from '@/pages/Login';

// Every authenticated route is code-split so the initial bundle carries
// only the landing shell + login. Dashboard, upload, submission review,
// and project pages ship as separate JS chunks that stream in on demand.
const Dashboard = lazy(() => import('@/pages/Dashboard'));
const Upload = lazy(() => import('@/pages/Upload'));
const SubmissionDetail = lazy(() => import('@/pages/SubmissionDetail'));
const ProjectDetail = lazy(() => import('@/pages/ProjectDetail'));
const KpiTracker = lazy(() => import('@/pages/KpiTracker'));
const Obligations = lazy(() => import('@/pages/Obligations'));
const InsuranceRenewals = lazy(() => import('@/pages/InsuranceRenewals'));
const Analytics = lazy(() => import('@/pages/Analytics'));
const Reports = lazy(() => import('@/pages/Reports'));
const NotFound = lazy(() => import('@/pages/NotFound'));

function LazyFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <LoadingSpinner />
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <RTLWrapper>
            <CommandPaletteProvider>
              <Suspense fallback={<LazyFallback />}>
                <Routes>
                  <Route path="/" element={<Landing />} />
                  <Route path="/login" element={<Login />} />
                  <Route
                    path="/dashboard"
                    element={
                      <ProtectedRoute>
                        <Dashboard />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/upload"
                    element={
                      <ProtectedRoute>
                        <Upload />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/submissions/:id"
                    element={
                      <ProtectedRoute>
                        <SubmissionDetail />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/projects/:id"
                    element={
                      <ProtectedRoute>
                        <ProjectDetail />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/kpi"
                    element={
                      <ProtectedRoute>
                        <KpiTracker />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/obligations"
                    element={
                      <ProtectedRoute>
                        <Obligations />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/insurance"
                    element={
                      <ProtectedRoute>
                        <InsuranceRenewals />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/projects"
                    element={
                      <ProtectedRoute>
                        <Dashboard />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/reports"
                    element={
                      <ProtectedRoute>
                        <Reports />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/analytics"
                    element={
                      <ProtectedRoute>
                        <Analytics />
                      </ProtectedRoute>
                    }
                  />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
            </CommandPaletteProvider>
          </RTLWrapper>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
