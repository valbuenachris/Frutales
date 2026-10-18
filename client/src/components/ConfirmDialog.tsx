import { Button } from './ui/Button';

interface ConfirmDialogProps {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isBusy?: boolean;
  errorMessage?: string | null;
  onConfirm: () => void;
  onClose: () => void;
}

/**
 * Mobile-first confirmation dialog (bottom sheet on phones, centered card on
 * desktop). Used before destructive actions such as deleting a project with
 * all of its data.
 */
export function ConfirmDialog({
  title,
  message,
  confirmLabel = 'Eliminar',
  cancelLabel = 'Cancelar',
  isBusy = false,
  errorMessage = null,
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <button
        type="button"
        aria-label="Cerrar"
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-slate-900/40"
      />
      <div
        role="alertdialog"
        aria-modal="true"
        aria-label={title}
        className="relative w-full rounded-t-2xl bg-white p-5 shadow-xl sm:max-w-md sm:rounded-2xl"
      >
        <h2 className="text-lg font-bold text-ink">{title}</h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">{message}</p>

        {errorMessage ? (
          <p className="mt-3 rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{errorMessage}</p>
        ) : null}

        <div className="mt-5 flex gap-3">
          <Button type="button" variant="secondary" fullWidth onClick={onClose}>
            {cancelLabel}
          </Button>
          <Button type="button" variant="destructive" fullWidth onClick={onConfirm} disabled={isBusy}>
            {isBusy ? 'Eliminando…' : confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
