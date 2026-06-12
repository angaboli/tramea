import type { HTMLAttributes } from 'react';

export function Card({ className = '', ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={[
        'bg-surface border border-border rounded-lg shadow-sm',
        'p-5 sm:p-6',
        className,
      ].join(' ')}
      {...props}
    />
  );
}
