import type { InputHTMLAttributes } from 'react';
import { cn } from '../../lib/format';

/** Large, touch-friendly input (56px tall, 18px text). */
export function Input({ className, ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        'h-14 w-full rounded-xl border border-stone-200 bg-white px-4 text-lg text-ink',
        'placeholder:text-slate-400 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20',
        'disabled:text-slate-500',
        className,
      )}
      {...rest}
    />
  );
}
