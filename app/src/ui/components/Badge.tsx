import type { HTMLAttributes } from 'react';

type Tone = 'primary' | 'accent' | 'success' | 'warning' | 'error' | 'neutral';

const tones: Record<Tone, string> = {
  primary: 'bg-primary-soft text-primary-soft-text',
  accent: 'bg-accent-soft text-accent-soft-text',
  success: 'bg-success-soft text-success',
  warning: 'bg-warning-soft text-warning',
  error: 'bg-error-soft text-error',
  neutral: 'bg-bg-subtle text-text-secondary',
};

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: Tone;
}

export function Badge({ tone = 'neutral', className = '', ...props }: BadgeProps) {
  return (
    <span
      className={[
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1',
        'text-xs font-semibold',
        tones[tone],
        className,
      ].join(' ')}
      {...props}
    />
  );
}
