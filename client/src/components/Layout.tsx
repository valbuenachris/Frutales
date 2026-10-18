import { useEffect, useState, type ReactNode } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import { cn } from '../lib/format';

interface NavItem {
  to: string;
  label: string;
  end: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Dashboard', end: true },
  { to: '/projects', label: 'Proyectos', end: false },
  { to: '/products', label: 'Productos', end: false },
  { to: '/processes', label: 'Procesos', end: false },
  { to: '/clients', label: 'Clientes', end: false },
];

/** Sidebar content shared by the desktop rail and the mobile drawer. */
function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const { user, logout } = useAuth();
  const items =
    user?.role === 'admin'
      ? [...NAV_ITEMS, { to: '/users', label: 'Usuarios', end: false }]
      : NAV_ITEMS;

  return (
    <div className="flex h-full flex-col p-4">
      <p className="px-3 pb-5 pt-2 text-xl font-bold tracking-tight text-ink">Frutales</p>
      <p className="px-3 pb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Menú</p>
      <nav className="flex flex-col gap-1">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                'flex min-h-11 items-center rounded-xl px-3 text-sm font-medium transition-colors',
                isActive ? 'bg-teal-50 text-teal-800' : 'text-slate-600 hover:bg-stone-100',
              )
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="mt-auto border-t border-stone-100 pt-4">
        <p className="truncate px-3 text-sm font-semibold text-ink">{user?.name}</p>
        <p className="truncate px-3 text-xs text-slate-500">{user?.email}</p>
        <p className="px-3 pt-1 text-xs font-medium text-slate-400">
          {user?.role === 'admin' ? 'Administrador' : 'Usuario'}
        </p>
        <button
          type="button"
          onClick={() => void logout()}
          className="mt-2 flex min-h-11 w-full items-center rounded-xl px-3 text-sm font-medium text-rose-600 transition-colors hover:bg-rose-50"
        >
          Cerrar sesión
        </button>
      </div>
    </div>
  );
}

/**
 * Application shell: fixed sidebar on desktop (md+), drawer with hamburger on
 * mobile (<768px). The drawer closes automatically on navigation.
 */
export function AppLayout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();

  // Close the mobile drawer whenever the route changes.
  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  return (
    <div className="min-h-dvh">
      {/* Mobile top bar */}
      <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-stone-200/80 bg-app/95 px-4 backdrop-blur md:hidden">
        <button
          type="button"
          onClick={() => setMenuOpen(true)}
          aria-label="Abrir menú"
          className="flex h-11 w-11 items-center justify-center rounded-xl text-slate-600 transition-colors hover:bg-stone-100"
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            aria-hidden="true"
          >
            <path d="M4 7h16M4 12h16M4 17h16" />
          </svg>
        </button>
        <span className="text-lg font-bold tracking-tight text-ink">Frutales</span>
      </header>

      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 border-r border-stone-200 bg-white md:block">
        <SidebarContent />
      </aside>

      {/* Mobile drawer */}
      {menuOpen ? (
        <div className="fixed inset-0 z-40 md:hidden">
          <button
            type="button"
            aria-label="Cerrar menú"
            onClick={() => setMenuOpen(false)}
            className="absolute inset-0 cursor-default bg-slate-900/40"
          />
          <div className="absolute inset-y-0 left-0 w-72 max-w-[85vw] bg-white shadow-xl">
            <SidebarContent onNavigate={() => setMenuOpen(false)} />
          </div>
        </div>
      ) : null}

      {/* Page content */}
      <div className="md:pl-60">
        <main className="mx-auto w-full max-w-2xl px-4 pb-12 pt-4 md:pt-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  /** When provided, renders a large back button (touch-friendly). */
  backTo?: string;
  action?: ReactNode;
}

export function PageHeader({ title, subtitle, backTo, action }: PageHeaderProps) {
  return (
    <header className="mb-6">
      <div className="flex items-center gap-3">
        {backTo ? (
          <Link
            to={backTo}
            aria-label="Volver"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-lg text-slate-600 shadow-sm ring-1 ring-stone-100 active:bg-stone-100"
          >
            ←
          </Link>
        ) : null}
        <h1 className="min-w-0 flex-1 truncate text-2xl font-bold tracking-tight text-ink">
          {title}
        </h1>
        {action}
      </div>
      {subtitle ? <p className="mt-2 text-sm text-slate-500">{subtitle}</p> : null}
    </header>
  );
}
