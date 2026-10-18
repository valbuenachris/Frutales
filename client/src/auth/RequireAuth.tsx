import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { LoadingState } from '../components/Feedback';
import { useAuth } from './AuthProvider';

/** Bloquea las rutas privadas y recuerda a dónde quería ir el usuario. */
export function RequireAuth() {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <LoadingState label="Verificando sesión…" />
      </div>
    );
  }

  if (!user) {
    const from = `${location.pathname}${location.search}`;
    return <Navigate to="/login" replace state={{ from }} />;
  }

  return <Outlet />;
}

/** Restringe una sección al rol administrador. */
export function RequireAdmin() {
  const { user } = useAuth();
  if (user?.role !== 'admin') {
    return <Navigate to="/" replace />;
  }
  return <Outlet />;
}
