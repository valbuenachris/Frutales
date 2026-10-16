import type { ReactNode } from 'react';

interface FieldProps {
  label: string;
  htmlFor?: string;
  /** Small helper text rendered under the control. */
  hint?: string;
  children: ReactNode;
}

/** Label + control + hint, stacked with comfortable spacing. */
export function Field({ label, htmlFor, hint, children }: FieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-sm font-medium text-slate-600">
        {label}
      </label>
      {children}
      {hint ? <p className="text-xs text-slate-400">{hint}</p> : null}
    </div>
  );
}
