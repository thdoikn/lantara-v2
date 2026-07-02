import { Routes, Route } from "react-router-dom";
import { Suspense, lazy, useEffect, useState } from "react";
import ProtectedRoute from "./components/ProtectedRoute";
import LantaraLoader from "./components/LantaraLoader";
import { Toaster } from "./components/Toaster";
import api from "./lib/api";
import { useAuthStore, getAccessToken, clearTokens } from "./lib/auth";

// Public
const LandingPage = lazy(() => import("./features/public/LandingPage"));
const ServiceCatalog = lazy(() => import("./features/public/ServiceCatalog"));
const PermitDetailPage = lazy(() => import("./features/public/PermitDetailPage"));
const PermitValidatePage = lazy(() => import("./features/public/PermitValidatePage"));
const NotFoundPage = lazy(() => import("./features/public/NotFoundPage"));

// Auth
const LoginPage = lazy(() => import("./features/auth/LoginPage"));
const RegisterPage = lazy(() => import("./features/auth/RegisterPage"));
const OTPPage = lazy(() => import("./features/auth/OTPPage"));
const ForgotPasswordPage = lazy(() => import("./features/auth/ForgotPasswordPage"));
const StaffLoginPage = lazy(() => import("./features/auth/StaffLoginPage"));
const OidcCallbackPage = lazy(() => import("./features/auth/OidcCallbackPage"));

// Applicant portal
const PortalLayout = lazy(() => import("./features/applicant/PortalLayout"));
const PortalDashboard = lazy(() => import("./features/applicant/PortalDashboard"));
const NewSubmissionPage = lazy(() => import("./features/applicant/NewSubmissionPage"));
const SubmissionDetailPage = lazy(() => import("./features/applicant/SubmissionDetailPage"));
const NotificationsPage = lazy(() => import("./features/applicant/NotificationsPage"));

// Verifier workspace
const VerifierLayout = lazy(() => import("./features/verifier/VerifierLayout"));
const VerifierDashboard = lazy(() => import("./features/verifier/VerifierDashboard"));
const VerifierQueue = lazy(() => import("./features/verifier/VerifierQueue"));
const VerifierSubmissionPage = lazy(() => import("./features/verifier/VerifierSubmissionPage"));

// Admin (Phase 2 Engine Builder)
const AdminLayout = lazy(() => import("./features/admin/AdminLayout"));
const AdminDashboard = lazy(() => import("./features/admin/AdminDashboard"));
const EngineBuilderPage = lazy(() => import("./features/admin/EngineBuilderPage"));
const IzinListPage = lazy(() => import("./features/admin/IzinListPage"));
const IzinBuilderPage = lazy(() => import("./features/admin/IzinBuilderPage"));
const AnalyticsPage = lazy(() => import("./features/admin/AnalyticsPage"));
const AdminUsersPage = lazy(() => import("./features/admin/AdminUsersPage"));
const AdminTenantsPage = lazy(() => import("./features/admin/AdminTenantsPage"));

// MPP Antrean (queue)
const MppLayout = lazy(() => import("./features/mpp/MppLayout"));
const TenantLayout = lazy(() => import("./features/mpp/TenantLayout"));
const TenantLoketsPage = lazy(() => import("./features/mpp/tenant/TenantLoketsPage"));
const TenantServicesPage = lazy(() => import("./features/mpp/tenant/TenantServicesPage"));
const TenantSettingsPage = lazy(() => import("./features/mpp/tenant/TenantSettingsPage"));
const TenantOperatorsPage = lazy(() => import("./features/mpp/tenant/TenantOperatorsPage"));
const TenantAnalyticsPage = lazy(() => import("./features/mpp/tenant/TenantAnalyticsPage"));
const QueueAnalytics = lazy(() => import("./features/mpp/QueueAnalytics"));
const OperatorConsolePage = lazy(() => import("./features/mpp/OperatorConsolePage"));
const SupervisorMonitorPage = lazy(() => import("./features/mpp/SupervisorMonitorPage"));
const CheckinStationPage = lazy(() => import("./features/mpp/CheckinStationPage"));
const DisplayBoardPage = lazy(() => import("./features/mpp/DisplayBoardPage"));
const QueueCatalogPage = lazy(() => import("./features/mpp/QueueCatalogPage"));
const MyTicketPage = lazy(() => import("./features/mpp/MyTicketPage"));
const KioskPage = lazy(() => import("./features/mpp/KioskPage"));

// RDTR (Phase 3)
const RDTRPage = lazy(() => import("./features/rdtr/RDTRPage"));

export default function App() {
  const setUser = useAuthStore((s) => s.setUser);
  // Rehydrate the signed-in user on every app load. Without this, a full page
  // reload (e.g. the SSO callback's redirect, or any refresh) leaves `user`
  // null even though a token exists — so role-driven UI (admin/verifier
  // portals) would never appear. Block routing until this resolves to avoid a
  // wrong-access flash.
  const [ready, setReady] = useState(() => !getAccessToken());
  useEffect(() => {
    if (!getAccessToken()) {
      setReady(true);
      return;
    }
    api
      .get("/auth/me/")
      .then((r) => setUser(r.data))
      .catch(() => {
        clearTokens();
        setUser(null);
      })
      .finally(() => setReady(true));
  }, [setUser]);

  if (!ready) return <LantaraLoader />;

  return (
    <Suspense fallback={<LantaraLoader />}>
      <Toaster />
      <Routes>
        {/* ── Public ── */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/layanan" element={<ServiceCatalog />} />
        <Route path="/layanan/:permitKey" element={<PermitDetailPage />} />
        <Route path="/validate" element={<PermitValidatePage />} />
        <Route path="/validate/:uuid" element={<PermitValidatePage />} />

        {/* ── Auth (public / warga) ── */}
        <Route path="/auth/login" element={<LoginPage />} />
        <Route path="/auth/register" element={<RegisterPage />} />
        <Route path="/auth/verify-otp" element={<OTPPage />} />
        <Route path="/auth/forgot-password" element={<ForgotPasswordPage />} />

        {/* ── Auth (OIKN staff SSO) ── */}
        <Route path="/staff/login" element={<StaffLoginPage />} />
        {/* Must be public — no ProtectedRoute wrapper */}
        <Route path="/auth/callback" element={<OidcCallbackPage />} />

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
          <Route path="notifications" element={<NotificationsPage />} />
        </Route>

        {/* ── Verifier workspace ── */}
        <Route
          path="/verifier"
          element={
            <ProtectedRoute requirePortal="verifier">
              <VerifierLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<VerifierDashboard />} />
          <Route path="queue" element={<VerifierQueue />} />
          <Route path="analitik" element={<AnalyticsPage />} />
          <Route path="submissions/:id" element={<VerifierSubmissionPage />} />
          <Route path="notifications" element={<NotificationsPage />} />
        </Route>

        {/* ── Admin Engine Builder (Phase 2) ── */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute requirePortal="admin">
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<AdminDashboard />} />
          <Route path="engine" element={<EngineBuilderPage />} />
          <Route path="engine/:sektorKey" element={<IzinListPage />} />
          <Route path="engine/:sektorKey/:izinKey" element={<IzinBuilderPage />} />
          <Route path="users" element={<AdminUsersPage />} />
          <Route path="tenants" element={<AdminTenantsPage />} />
          <Route path="analytics" element={<AnalyticsPage />} />
          <Route
            path="queue-analytics"
            element={
              <div className="mx-auto max-w-6xl">
                <QueueAnalytics title="Analitik Antrean MPP" />
              </div>
            }
          />
        </Route>

        {/* ── Antrean MPP — citizen surfaces ── */}
        {/* Public catalog: browse tenants/services (take-number requires login) */}
        <Route path="/antrean" element={<QueueCatalogPage />} />
        {/* Anonymous on-site e-kiosk (walk-in) */}
        <Route path="/antrean/kiosk" element={<KioskPage />} />
        {/* A citizen's own ticket */}
        <Route
          path="/antrean/tiket/:id"
          element={
            <ProtectedRoute>
              <MyTicketPage />
            </ProtectedRoute>
          }
        />

        {/* ── Loket Portal (counter operators) ── */}
        <Route
          path="/loket"
          element={
            <ProtectedRoute requirePortal="loket">
              <MppLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<OperatorConsolePage />} />
          <Route path="checkin" element={<CheckinStationPage />} />
          <Route path="analitik" element={<QueueAnalytics title="Analitik Loket Saya" />} />
        </Route>

        {/* ── Tenant Portal (tenant admins) ── */}
        <Route
          path="/tenant"
          element={
            <ProtectedRoute requirePortal="tenant">
              <TenantLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<SupervisorMonitorPage />} />
          <Route path="loket" element={<TenantLoketsPage />} />
          <Route path="layanan" element={<TenantServicesPage />} />
          <Route path="jam" element={<TenantSettingsPage />} />
          <Route path="petugas" element={<TenantOperatorsPage />} />
          <Route path="analitik" element={<TenantAnalyticsPage />} />
        </Route>

        {/* Public lobby display board — no auth (a screen on the wall) */}
        <Route path="/mpp/display/:instansiKey" element={<DisplayBoardPage />} />

        {/* ── RDTR (Phase 3) — public map viewer, no auth required ── */}
        <Route path="/rdtr" element={<RDTRPage />} />

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  );
}
