import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./hooks/useAuth";
import { useOverview } from "./hooks/useOverview";
import { ThemeProvider } from "./hooks/useTheme";
import { isForbiddenError } from "./lib/api";
import { Layout } from "./components/Layout";
import SignIn from "./pages/SignIn";
import AccessDenied from "./pages/AccessDenied";

const Overview = lazy(() => import("./pages/Overview"));
const Orgs = lazy(() => import("./pages/Orgs"));
const OrgDetail = lazy(() => import("./pages/OrgDetail"));
const Users = lazy(() => import("./pages/Users"));
const Billing = lazy(() => import("./pages/Billing"));
const Runs = lazy(() => import("./pages/Runs"));
const AuditLog = lazy(() => import("./pages/AuditLog"));

function RouteFallback() {
  return <div className="flex min-h-screen items-center justify-center text-sm text-zinc-500">Loading…</div>;
}

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
});

/** Signs in via the same Supabase session as the app, then gates on GET /api/admin/overview — a 403 there (not a route guard) is the real enforcement. */
function ProtectedShell() {
  const { authenticated, loading: authLoading } = useAuth();
  const overview = useOverview();

  if (authLoading) return <RouteFallback />;
  if (!authenticated) return <Navigate to="/signin" replace />;
  if (overview.isLoading) return <RouteFallback />;
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
                  <Route path="/billing" element={<Billing />} />
                  <Route path="/runs" element={<Runs />} />
                  <Route path="/audit" element={<AuditLog />} />
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
