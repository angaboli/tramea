import type { InputHTMLAttributes } from 'react';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export function Input({ label, id, className = '', ...props }: InputProps) {
  return (
    <label className="flex flex-col gap-1.5">
      {label && (
        <span className="text-sm font-semibold text-text-secondary">{label}</span>
      )}
      <input
        id={id}
        className={[
          'min-h-[44px] w-full rounded-md border border-border-strong bg-surface',
          'px-3.5 text-[15px] text-text placeholder:text-text-muted',
          'focus-visible:shadow-focus focus-visible:outline-none focus-visible:border-primary',
          className,
        ].join(' ')}
        {...props}
      />
    </label>
  );
}
