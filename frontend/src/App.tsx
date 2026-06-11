import { Routes, Route } from "react-router-dom";
import { Suspense, lazy } from "react";

// Public routes (lazy for code splitting)
const LandingPage = lazy(() => import("./features/public/LandingPage"));
const NotFoundPage = lazy(() => import("./features/public/NotFoundPage"));

function LoadingSpinner() {
  return (
    <div className="flex h-screen items-center justify-center bg-background">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
    </div>
  );
}

export default function App() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <Routes>
        {/* Public */}
        <Route path="/" element={<LandingPage />} />

        {/* Auth — Phase 1 */}
        <Route path="/auth/*" element={<div>Auth (coming soon)</div>} />

        {/* Applicant portal — Phase 1 */}
        <Route path="/portal/*" element={<div>Portal (coming soon)</div>} />

        {/* Verifier workspace — Phase 1 */}
        <Route path="/verifier/*" element={<div>Verifier (coming soon)</div>} />

        {/* Admin — Phase 2 */}
        <Route path="/admin/*" element={<div>Admin (coming soon)</div>} />

        {/* Public permit validation — Phase 1 */}
        <Route path="/validate/:uuid" element={<div>Validasi Izin (coming soon)</div>} />

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  );
}
