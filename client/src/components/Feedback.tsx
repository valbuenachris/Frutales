import type { ReactNode } from 'react';
import { Button } from './ui/Button';

/** Centered loading placeholder. */
export function LoadingState({ label = 'Cargando…' }: { label?: string }) {
  return <p className="py-10 text-center text-sm text-slate-400">{label}</p>;
}

/** Error card with optional retry action. */
export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="rounded-2xl bg-rose-50 p-5 text-center">
      <p className="text-sm text-rose-700">{message}</p>
      {onRetry ? (
        <Button variant="secondary" className="mt-4" onClick={onRetry}>
          Reintentar
        </Button>
      ) : null}
    </div>
  );
}

interface EmptyStateProps {
  title: string;
  description: string;
  action?: ReactNode;
}

/** Friendly empty state used on the dashboard. */
export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="rounded-2xl bg-white p-6 text-center shadow-sm ring-1 ring-stone-100">
      <p className="text-base font-semibold text-ink">{title}</p>
      <p className="mt-1 text-sm text-slate-500">{description}</p>
      {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
    </div>
  );
}
