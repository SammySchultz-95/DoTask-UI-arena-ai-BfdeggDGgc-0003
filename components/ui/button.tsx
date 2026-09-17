'use client';

import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { Spinner } from './spinner';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';
type Size = 'xs' | 'sm' | 'md';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

const variantClasses: Record<Variant, string> = {
  primary:
    'bg-neon-gradient text-ink-950 font-semibold shadow-glow-sm hover:brightness-110 ' +
    'focus-visible:ring-neon-500/40 disabled:shadow-none',
  secondary:
    'border border-ink-400 bg-ink-700 text-fog hover:border-neon-500/50 hover:text-neon-300 ' +
    'focus-visible:ring-neon-500/30',
  ghost:
    'text-fog-dim hover:bg-ink-700 hover:text-fog focus-visible:ring-neon-500/30',
  outline:
    'border border-neon-500/60 text-neon-300 hover:bg-neon-500/10 focus-visible:ring-neon-500/30',
  danger:
    'border border-red-500/40 bg-red-500/10 text-red-300 hover:bg-red-500/20 ' +
    'focus-visible:ring-red-500/30',
};

const sizeClasses: Record<Size, string> = {
  xs: 'h-7 px-2.5 text-xs gap-1.5 rounded-md',
  sm: 'h-9 px-3 text-sm gap-2 rounded-lg',
  md: 'h-10 px-4 text-sm gap-2 rounded-lg',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'secondary', size = 'md', loading = false, className = '', children, disabled, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center whitespace-nowrap transition outline-none ` +
        `focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-50 ` +
        `${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      {...rest}
    >
      {loading && <Spinner className="h-3.5 w-3.5" />}
      {children}
    </button>
  );
});
