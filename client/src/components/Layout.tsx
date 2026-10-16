import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

/** Page shell: centered column, comfortable padding, mobile-first. */
export function Layout({ children }: { children: ReactNode }) {
  return <div className="mx-auto min-h-dvh w-full max-w-xl px-4 pb-12 pt-6">{children}</div>;
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
