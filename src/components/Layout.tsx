import type { ReactNode } from "react";
import { NavLink, Outlet, useLocation, useParams } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { useTheme } from "../hooks/useTheme";

type NavItem = {
  to: string;
  label: string;
  end?: boolean;
  icon: (props: { className?: string }) => ReactNode;
};

function IconOverview({ className = "size-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden="true">
      <path d="M3 3h6v6H3V3Zm8 0h6v4h-6V3ZM3 11h6v6H3v-6Zm8 2h6v4h-6v-4Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}

function IconOrgs({ className = "size-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden="true">
      <path
        d="M3.5 16.5V7.2L10 3.5l6.5 3.7v9.3M7 16.5V11h6v5.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconUsers({ className = "size-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden="true">
      <path
        d="M13.5 16.5v-1a3 3 0 0 0-3-3h-5a3 3 0 0 0-3 3v1M8.5 9.5a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM16.5 16.5v-1a3 3 0 0 0-2-2.83M13.5 3.67a3 3 0 0 1 0 5.66"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconBilling({ className = "size-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden="true">
      <rect x="2.5" y="4.5" width="15" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M2.5 8h15M6 12.5h3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function IconRuns({ className = "size-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden="true">
      <path d="M4 4.5h12v11H4v-11Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M7 8.5h6M7 11.5h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function IconAudit({ className = "size-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden="true">
      <path
        d="M6 3.5h8a1.5 1.5 0 0 1 1.5 1.5v10A1.5 1.5 0 0 1 14 16.5H6A1.5 1.5 0 0 1 4.5 15V5A1.5 1.5 0 0 1 6 3.5Z"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path d="M7.5 7.5h5M7.5 10.5h5M7.5 13.5h3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function IconMenu({ className = "size-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" className={className} aria-hidden="true">
      <path d="M2.5 4h11M2.5 8h11M2.5 12h11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function IconSun({ className = "size-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" className={className} aria-hidden="true">
      <circle cx="8" cy="8" r="2.5" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M8 1.5v1.5M8 13v1.5M1.5 8H3M13 8h1.5M3.4 3.4l1.1 1.1M11.5 11.5l1.1 1.1M3.4 12.6l1.1-1.1M11.5 4.5l1.1-1.1"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconMoon({ className = "size-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" className={className} aria-hidden="true">
      <path
        d="M13 9.5A5.5 5.5 0 0 1 6.5 3 5.5 5.5 0 1 0 13 9.5Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconSignOut({ className = "size-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" className={className} aria-hidden="true">
      <path
        d="M6 3H3.5A1.5 1.5 0 0 0 2 4.5v7A1.5 1.5 0 0 0 3.5 13H6M10.5 11.5 14 8l-3.5-3.5M14 8H6"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const NAV: NavItem[] = [
  { to: "/", label: "Overview", end: true, icon: IconOverview },
  { to: "/orgs", label: "Organizations", icon: IconOrgs },
  { to: "/users", label: "Users", icon: IconUsers },
  { to: "/billing", label: "Billing", icon: IconBilling },
  { to: "/runs", label: "Review runs", icon: IconRuns },
  { to: "/audit", label: "Audit log", icon: IconAudit },
];

function useHeaderMeta(): { title: string; crumb?: string } {
  const location = useLocation();
  const { id } = useParams<{ id: string }>();
  const path = location.pathname;

  if (path === "/") return { title: "Overview", crumb: "Platform" };
  if (path === "/orgs") return { title: "Organizations", crumb: "Platform" };
  if (path.startsWith("/orgs/") && id) return { title: "Organization detail", crumb: "Organizations" };
  if (path === "/users") return { title: "Users", crumb: "Platform" };
  if (path === "/billing") return { title: "Billing", crumb: "Platform" };
  if (path === "/runs") return { title: "Review runs", crumb: "Activity" };
  if (path === "/audit") return { title: "Audit log", crumb: "Activity" };
  return { title: "Admin", crumb: "Platform" };
}

export function Layout() {
  const { user, signOut } = useAuth();
  const { theme, toggleTheme, sidebarCollapsed, toggleSidebar } = useTheme();
  const { title, crumb } = useHeaderMeta();
  const initials = (user?.email ?? "A").slice(0, 1).toUpperCase();

  return (
    <div className="flex h-full overflow-hidden">
      <aside
        className={`flex shrink-0 flex-col border-r border-zinc-800 bg-[var(--console-sidebar)] transition-[width] duration-200 ease-out ${
          sidebarCollapsed ? "w-16" : "w-60"
        }`}
      >
        <div
          className={`flex h-14 shrink-0 items-center border-b border-zinc-800 ${
            sidebarCollapsed ? "justify-center px-2" : "gap-2.5 px-4"
          }`}
        >
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-zinc-50 text-xs font-semibold text-zinc-900">
            CF
          </div>
          {!sidebarCollapsed && (
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-zinc-50">CodeFerret</p>
              <p className="truncate text-[11px] text-zinc-500">Admin console</p>
            </div>
          )}
        </div>

        <nav className={`flex flex-1 flex-col gap-0.5 overflow-y-auto py-3 ${sidebarCollapsed ? "px-2" : "px-3"}`}>
          {!sidebarCollapsed && (
            <p className="mb-1 px-2 text-[11px] font-medium uppercase tracking-wider text-zinc-600">Platform</p>
          )}
          {NAV.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                title={item.label}
                className={({ isActive }) =>
                  `group flex items-center rounded-lg text-sm font-medium transition ${
                    sidebarCollapsed ? "justify-center p-2.5" : "gap-3 px-2.5 py-2"
                  } ${
                    isActive
                      ? "bg-zinc-800 text-zinc-50"
                      : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100"
                  }`
                }
              >
                <Icon className="size-[18px] shrink-0 opacity-90" />
                {!sidebarCollapsed && <span className="truncate">{item.label}</span>}
              </NavLink>
            );
          })}
        </nav>
      </aside>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-[var(--console-bg)] text-[var(--console-fg)]">
        <header className="flex h-14 shrink-0 items-center gap-3 border-b border-zinc-800 bg-[var(--console-sidebar)] px-4">
          <button
            type="button"
            onClick={toggleSidebar}
            className="flex size-9 shrink-0 items-center justify-center rounded-lg text-zinc-400 transition hover:bg-zinc-900 hover:text-zinc-100"
            aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <IconMenu className="size-5" />
          </button>

          <div className="min-w-0 flex-1">
            {crumb && <p className="truncate text-[11px] font-medium text-zinc-500">{crumb}</p>}
            <h1 className="truncate text-sm font-semibold text-zinc-50">{title}</h1>
          </div>

          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={toggleTheme}
              className="flex size-9 items-center justify-center rounded-lg text-zinc-400 transition hover:bg-zinc-900 hover:text-zinc-100"
              aria-label={theme === "light" ? "Switch to dark theme" : "Switch to light theme"}
              title={theme === "light" ? "Switch to dark theme" : "Switch to light theme"}
            >
              {theme === "light" ? <IconMoon className="size-[18px]" /> : <IconSun className="size-[18px]" />}
            </button>

            <div className="mx-1 hidden h-6 w-px bg-zinc-800 sm:block" />

            <div className="hidden items-center gap-2 rounded-lg px-2 py-1 sm:flex">
              <div className="flex size-7 items-center justify-center rounded-full bg-zinc-800 text-[11px] font-semibold text-zinc-200">
                {initials}
              </div>
              <div className="min-w-0 max-w-[10rem]">
                <p className="truncate text-xs font-medium text-zinc-200" title={user?.email ?? undefined}>
                  {user?.email ?? "Admin"}
                </p>
                <p className="text-[10px] text-zinc-500">Platform admin</p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => void signOut()}
              className="flex size-9 items-center justify-center rounded-lg text-zinc-400 transition hover:bg-zinc-900 hover:text-zinc-100"
              aria-label="Sign out"
              title="Sign out"
            >
              <IconSignOut className="size-[18px]" />
            </button>
          </div>
        </header>

        <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
