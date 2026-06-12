import type { ButtonHTMLAttributes } from 'react';

type Variant = 'primary' | 'accent' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  full?: boolean;
}

const variants: Record<Variant, string> = {
  primary:
    'bg-primary text-text-inverse hover:bg-primary-hover active:bg-primary-active',
  accent:
    'bg-accent text-text-inverse hover:bg-accent-hover active:bg-accent-active',
  secondary:
    'bg-surface text-text border border-border-strong hover:bg-surface-hover',
  ghost: 'bg-transparent text-text-secondary hover:bg-surface-hover',
  danger: 'bg-error text-text-inverse hover:opacity-90',
};

// Mobile-first : cibles tactiles >= 44px.
const sizes: Record<Size, string> = {
  sm: 'min-h-[40px] px-4 text-sm',
  md: 'min-h-[44px] px-5 text-[15px]',
  lg: 'min-h-[52px] px-7 text-base',
};

export function Button({
  variant = 'primary',
  size = 'md',
  full = false,
  className = '',
  ...props
}: ButtonProps) {
  return (
    <button
      className={[
        'inline-flex items-center justify-center gap-2 rounded-md font-semibold',
        'transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
        'focus-visible:shadow-focus focus-visible:outline-none',
        variants[variant],
        sizes[size],
        full ? 'w-full' : '',
        className,
      ].join(' ')}
      {...props}
    />
  );
}
