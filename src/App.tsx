import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./hooks/useAuth";
import { useIdleTimeout } from "./hooks/useIdleTimeout";
import { useOverview } from "./hooks/useOverview";
import { useSlowLoad } from "./hooks/useSlowLoad";
import { ThemeProvider } from "./hooks/useTheme";
import { isForbiddenError } from "./lib/api";
import { Layout } from "./components/Layout";
import SignIn from "./pages/SignIn";
import AccessDenied from "./pages/AccessDenied";

const Overview = lazy(() => import("./pages/Overview"));
const Orgs = lazy(() => import("./pages/Orgs"));
const OrgDetail = lazy(() => import("./pages/OrgDetail"));
const Users = lazy(() => import("./pages/Users"));
const Admins = lazy(() => import("./pages/Admins"));
const Billing = lazy(() => import("./pages/Billing"));
const BillingAnalytics = lazy(() => import("./pages/BillingAnalytics"));
const Runs = lazy(() => import("./pages/Runs"));
const RunDetail = lazy(() => import("./pages/RunDetail"));
const RunsAnalytics = lazy(() => import("./pages/RunsAnalytics"));
const AuditLog = lazy(() => import("./pages/AuditLog"));
const AuditAnalytics = lazy(() => import("./pages/AuditAnalytics"));

function RouteFallback() {
  return <div className="flex min-h-screen items-center justify-center text-sm text-zinc-500">Loading…</div>;
}

/** Shown once a load has taken long enough that it's clearly not a normal fast fetch — the
 * backend's Render tier hibernates when idle, and the first request after that can take up
 * to a minute, which reads as broken without an explanation. */
function WakingUpMessage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-2 px-6 text-center text-sm text-zinc-500">
      <p>Waking up the server…</p>
      <p className="text-xs text-zinc-600">The backend goes to sleep when idle — this can take up to a minute on the first load.</p>
    </div>
  );
}

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
});

/** A signed-in admin session can suspend orgs, change billing, and add/revoke
 * other admins — 30 minutes of no keyboard/mouse/scroll activity signs out automatically rather
 * than leaving that access live indefinitely on a shared/unattended machine. */
const IDLE_TIMEOUT_MS = 30 * 60 * 1000;

/** Signs in via the same Supabase session as the app, then gates on GET /api/admin/overview — a 403 there (not a route guard) is the real enforcement. */
function ProtectedShell() {
  const { authenticated, loading: authLoading, signOut } = useAuth();
  const overview = useOverview(!authLoading && authenticated);
  useIdleTimeout(signOut, IDLE_TIMEOUT_MS, authenticated);
  const overviewSlow = useSlowLoad(overview.isLoading);

  if (authLoading) return <RouteFallback />;
  if (!authenticated) return <Navigate to="/signin" replace />;
  if (overview.isLoading) return overviewSlow ? <WakingUpMessage /> : <RouteFallback />;
  if (overview.isError) {
    if (isForbiddenError(overview.error)) return <AccessDenied />;
    return (
      <div className="flex min-h-screen items-center justify-center px-6 text-center text-sm text-red-400">
        Failed to reach the backend admin API: {(overview.error as Error).message}
      </div>
    );
  }
  return <Layout />;
}

export default function App() {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <div className="h-full">
            <Suspense fallback={<RouteFallback />}>
              <Routes>
                <Route path="/signin" element={<SignIn />} />
                <Route element={<ProtectedShell />}>
                  <Route path="/" element={<Overview />} />
                  <Route path="/orgs" element={<Orgs />} />
                  <Route path="/orgs/:id" element={<OrgDetail />} />
                  <Route path="/users" element={<Users />} />
                  <Route path="/admins" element={<Admins />} />
                  <Route path="/billing" element={<Billing />} />
                  <Route path="/billing/analytics" element={<BillingAnalytics />} />
                  <Route path="/runs" element={<Runs />} />
                  <Route path="/runs/analytics" element={<RunsAnalytics />} />
                  <Route path="/runs/:id" element={<RunDetail />} />
                  <Route path="/audit" element={<AuditLog />} />
                  <Route path="/audit/analytics" element={<AuditAnalytics />} />
                </Route>
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Suspense>
          </div>
        </BrowserRouter>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
