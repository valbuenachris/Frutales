import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './auth/AuthProvider';
import { RequireAdmin, RequireAuth } from './auth/RequireAuth';
import { AppLayout } from './components/Layout';
import { ClientsPage } from './pages/ClientsPage';
import { DashboardPage } from './pages/DashboardPage';
import { LoginPage } from './pages/LoginPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { ProcessesPage } from './pages/ProcessesPage';
import { ProductsPage } from './pages/ProductsPage';
import { ProjectDetailsPage } from './pages/ProjectDetailsPage';
import { ProjectFormPage } from './pages/ProjectFormPage';
import { ProjectsPage } from './pages/ProjectsPage';
import { UsersPage } from './pages/UsersPage';

/** Server-state cache shared by every screen (TanStack Query). */
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Public screen */}
            <Route path="/login" element={<LoginPage />} />

            {/* Every other screen requires an active session. */}
            <Route element={<RequireAuth />}>
              <Route element={<AppLayout />}>
                <Route path="/" element={<DashboardPage />} />
                <Route path="/dashboard" element={<Navigate to="/" replace />} />
                <Route path="/projects" element={<ProjectsPage />} />
                <Route path="/projects/new" element={<ProjectFormPage />} />
                <Route path="/projects/:id" element={<ProjectDetailsPage />} />
                <Route path="/projects/:id/edit" element={<ProjectFormPage />} />
                <Route path="/products" element={<ProductsPage />} />
                <Route path="/processes" element={<ProcessesPage />} />
                <Route path="/clients" element={<ClientsPage />} />
                <Route element={<RequireAdmin />}>
                  <Route path="/users" element={<UsersPage />} />
                </Route>
                <Route path="*" element={<NotFoundPage />} />
              </Route>
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}
