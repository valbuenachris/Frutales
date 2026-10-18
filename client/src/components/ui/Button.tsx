import type { ButtonHTMLAttributes } from 'react';
import { cn } from '../../lib/format';

type Variant = 'primary' | 'secondary' | 'danger' | 'destructive' | 'ghost';

const VARIANT_CLASSES: Record<Variant, string> = {
  primary: 'bg-brand text-white shadow-sm hover:bg-brand-dark active:bg-brand-dark',
  secondary: 'border border-stone-200 bg-white text-ink hover:bg-stone-50',
  danger: 'border border-rose-200 bg-white text-rose-600 hover:bg-rose-50',
  destructive: 'bg-rose-600 text-white shadow-sm hover:bg-rose-700 active:bg-rose-700',
  ghost: 'text-slate-500 hover:bg-stone-100',
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  fullWidth?: boolean;
}

/** Touch-friendly button (48px+ min height) used across the app. */
export function Button({
  variant = 'primary',
  fullWidth = false,
  className,
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-5 text-base font-medium transition-colors',
        'disabled:cursor-not-allowed disabled:opacity-50',
        VARIANT_CLASSES[variant],
        fullWidth && 'w-full',
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}
