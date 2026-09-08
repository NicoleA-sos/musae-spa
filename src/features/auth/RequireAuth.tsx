import { Navigate, useLocation } from 'react-router-dom';
import type { PropsWithChildren } from 'react';

import { useAuth } from './AuthProvider';

interface RequireAuthProps extends PropsWithChildren {
  requireAdmin?: boolean;
}

export function RequireAuth({ children, requireAdmin = false }: RequireAuthProps) {
  const { isConfigured, isLoading, profile, user } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8" aria-live="polite">
        <p className="text-slate-600">Comprobando tu sesión…</p>
      </section>
    );
  }

  if (!isConfigured) {
    return <Navigate to="/auth" replace />;
  }

  if (!user) {
    return <Navigate to="/auth" replace state={{ from: location.pathname }} />;
  }

  if (requireAdmin && profile?.role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

