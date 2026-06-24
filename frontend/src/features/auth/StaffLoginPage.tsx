import { Navigate } from "react-router-dom";

/**
 * Staff SSO login is now merged into the unified /auth/login page (the SSO
 * button lives at the top there). This route is kept only so existing
 * bookmarks/links to /staff/login keep working.
 */
export default function StaffLoginPage() {
  return <Navigate to="/auth/login" replace />;
}
