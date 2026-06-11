import { Routes, Route } from "react-router-dom";
import { Suspense, lazy } from "react";
import ProtectedRoute from "./components/ProtectedRoute";

// Public
const LandingPage = lazy(() => import("./features/public/LandingPage"));
const ServiceCatalog = lazy(() => import("./features/public/ServiceCatalog"));
const PermitValidatePage = lazy(() => import("./features/public/PermitValidatePage"));
const NotFoundPage = lazy(() => import("./features/public/NotFoundPage"));

// Auth
const LoginPage = lazy(() => import("./features/auth/LoginPage"));
const RegisterPage = lazy(() => import("./features/auth/RegisterPage"));
const OTPPage = lazy(() => import("./features/auth/OTPPage"));
const ForgotPasswordPage = lazy(() => import("./features/auth/ForgotPasswordPage"));

// Applicant portal
const PortalLayout = lazy(() => import("./features/applicant/PortalLayout"));
const PortalDashboard = lazy(() => import("./features/applicant/PortalDashboard"));
const NewSubmissionPage = lazy(() => import("./features/applicant/NewSubmissionPage"));
const SubmissionDetailPage = lazy(() => import("./features/applicant/SubmissionDetailPage"));

// Verifier workspace
const VerifierLayout = lazy(() => import("./features/verifier/VerifierLayout"));
const VerifierQueue = lazy(() => import("./features/verifier/VerifierQueue"));
const VerifierSubmissionPage = lazy(() => import("./features/verifier/VerifierSubmissionPage"));

// Admin (Phase 2 Engine Builder)
const AdminLayout = lazy(() => import("./features/admin/AdminLayout"));
const AdminDashboard = lazy(() => import("./features/admin/AdminDashboard"));
const EngineBuilderPage = lazy(() => import("./features/admin/EngineBuilderPage"));
const IzinListPage = lazy(() => import("./features/admin/IzinListPage"));
const IzinBuilderPage = lazy(() => import("./features/admin/IzinBuilderPage"));
const AnalyticsPage = lazy(() => import("./features/admin/AnalyticsPage"));

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
        {/* ── Public ── */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/layanan" element={<ServiceCatalog />} />
        <Route path="/validate/:uuid" element={<PermitValidatePage />} />

        {/* ── Auth ── */}
        <Route path="/auth/login" element={<LoginPage />} />
        <Route path="/auth/register" element={<RegisterPage />} />
        <Route path="/auth/verify-otp" element={<OTPPage />} />
        <Route path="/auth/forgot-password" element={<ForgotPasswordPage />} />

        {/* ── Applicant portal ── */}
        <Route
          path="/portal"
          element={
            <ProtectedRoute>
              <PortalLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<PortalDashboard />} />
          <Route path="new/:permitKey" element={<NewSubmissionPage />} />
          <Route path="submissions/:id" element={<SubmissionDetailPage />} />
        </Route>

        {/* ── Verifier workspace ── */}
        <Route
          path="/verifier"
          element={
            <ProtectedRoute requireRoles={["superadmin", "staff"]}>
              <VerifierLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<VerifierQueue />} />
          <Route path="submissions/:id" element={<VerifierSubmissionPage />} />
        </Route>

        {/* ── Admin Engine Builder (Phase 2) ── */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute requireRoles={["superadmin"]}>
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<AdminDashboard />} />
          <Route path="engine" element={<EngineBuilderPage />} />
          <Route path="engine/:sektorKey" element={<IzinListPage />} />
          <Route path="engine/:sektorKey/:izinKey" element={<IzinBuilderPage />} />
          <Route path="analytics" element={<AnalyticsPage />} />
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  );
}
