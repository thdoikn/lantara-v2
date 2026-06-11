import { Navigate, useLocation } from "react-router-dom";
import { useAuthStore } from "@/lib/auth";

interface Props {
  children: React.ReactNode;
  requireRoles?: string[];
}

export default function ProtectedRoute({ children, requireRoles }: Props) {
  const { isAuthenticated, user } = useAuthStore();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/auth/login" state={{ from: location }} replace />;
  }

  if (requireRoles && user) {
    const hasRole = requireRoles.some(
      (r) => user.roles.includes(r) || (r === "staff" && user.is_staff)
    );
    if (!hasRole) return <Navigate to="/portal" replace />;
  }

  return <>{children}</>;
}
