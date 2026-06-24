import { Navigate, useLocation } from "react-router-dom";
import { useAuthStore } from "@/lib/auth";
import { getPortals, type StaffPortal } from "@/lib/access";

interface Props {
  children: React.ReactNode;
  /** Restrict to users who can enter this staff portal. Omit for any signed-in user. */
  requirePortal?: StaffPortal;
}

export default function ProtectedRoute({ children, requirePortal }: Props) {
  const { isAuthenticated, user } = useAuthStore();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/auth/login" state={{ from: location }} replace />;
  }

  if (requirePortal && user) {
    if (!getPortals(user)[requirePortal]) {
      // No access — send to landing, which shows the portals they can enter.
      return <Navigate to="/" replace />;
    }
  }

  return <>{children}</>;
}
