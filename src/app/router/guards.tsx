import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/app/providers/authContext';
import { LoadingState } from '@/components/common/States';

export function RequireAuth({ children }: { children: ReactNode }) {
  const { status, user, sessionExpired } = useAuth();
  const location = useLocation();
  if (status === 'loading') return <LoadingState minHeight={400} />;
  if (status === 'anonymous') {
    return <Navigate to={sessionExpired ? '/login?expired=1' : '/login'} replace state={{ from: location.pathname + location.search }} />;
  }
  if (user?.mustChangePassword && location.pathname !== '/change-password') return <Navigate to="/change-password" replace />;
  return <>{children}</>;
}
