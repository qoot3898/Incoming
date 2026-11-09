import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/app/providers/authContext';
import { LoadingState } from '@/components/common/States';
import { ASSIGNMENT_OPEN_ROUTES, ASSIGNMENT_ROUTE, needsAssignment } from '@/features/authentication/assignment';

/**
 * Signed-in area. Account gates are applied in order: temporary password → assignment letter
 * (TL-N3: no work before an approved letter; super admins are exempt).
 */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { status, user, sessionExpired } = useAuth();
  const location = useLocation();
  if (status === 'loading') return <LoadingState minHeight={400} />;
  if (status === 'anonymous') {
    return <Navigate to={sessionExpired ? '/login?expired=1' : '/login'} replace state={{ from: location.pathname + location.search }} />;
  }
  if (user?.mustChangePassword && location.pathname !== '/change-password') return <Navigate to="/change-password" replace />;
  if (!user?.mustChangePassword && needsAssignment(user) && !ASSIGNMENT_OPEN_ROUTES.includes(location.pathname)) {
    return <Navigate to={ASSIGNMENT_ROUTE} replace />;
  }
  return <>{children}</>;
}
