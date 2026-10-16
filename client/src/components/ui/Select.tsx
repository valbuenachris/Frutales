import type { SelectHTMLAttributes } from 'react';
import { cn } from '../../lib/format';

/** Large, touch-friendly select matching the Input styling. */
export function Select({ className, children, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        'h-14 w-full appearance-none rounded-xl border border-stone-200 bg-white px-4 text-lg text-ink',
        'focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20',
        className,
      )}
      {...rest}
    >
      {children}
    </select>
  );
}
