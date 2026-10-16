import { cn } from '../lib/format';
import type { PaymentStatus } from '../types/project';

const STATUS_STYLES: Record<PaymentStatus, string> = {
  Pagado: 'bg-emerald-50 text-emerald-700',
  Pendiente: 'bg-amber-50 text-amber-700',
  Vencido: 'bg-rose-50 text-rose-700',
};

interface PaymentStatusBadgeProps {
  status: PaymentStatus | null;
  className?: string;
}

/**
 * Color-coded payment status chip:
 * green "Pagado", yellow "Pendiente", red "Vencido" and a neutral
 * "Sin venta" when Fase 2 has not been registered yet.
 */
export function PaymentStatusBadge({ status, className }: PaymentStatusBadgeProps) {
  return (
    <span
      className={cn(
        'shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold',
        status ? STATUS_STYLES[status] : 'bg-stone-100 text-slate-500',
        className,
      )}
    >
      {status ?? 'Sin venta'}
    </span>
  );
}
