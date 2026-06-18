import { useState, type InputHTMLAttributes } from 'react';

export interface PasswordInputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
}

/** Champ mot de passe avec bouton « œil » pour afficher/masquer la saisie. */
export function PasswordInput({ label, id, className = '', ...props }: PasswordInputProps) {
  const [show, setShow] = useState(false);
  return (
    <label className="flex flex-col gap-1.5">
      {label && <span className="text-sm font-semibold text-text-secondary">{label}</span>}
      <span className="relative flex items-center">
        <input
          id={id}
          type={show ? 'text' : 'password'}
          className={[
            'min-h-[44px] w-full rounded-md border border-border-strong bg-surface',
            'px-3.5 pr-11 text-[15px] text-text placeholder:text-text-muted',
            'focus-visible:shadow-focus focus-visible:outline-none focus-visible:border-primary',
            className,
          ].join(' ')}
          {...props}
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          aria-label={show ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
          title={show ? 'Masquer' : 'Afficher'}
          className="absolute right-2 flex h-8 w-8 items-center justify-center rounded-md text-text-muted hover:text-text focus-visible:shadow-focus focus-visible:outline-none"
        >
          {show ? (
            // œil barré
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 10 8 10 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
              <path d="M6.61 6.61A18.5 18.5 0 0 0 2 12s3 8 10 8a9.12 9.12 0 0 0 5.39-1.61" />
              <line x1="2" y1="2" x2="22" y2="22" />
            </svg>
          ) : (
            // œil
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 12s3-8 10-8 10 8 10 8-3 8-10 8-10-8-10-8z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          )}
        </button>
      </span>
    </label>
  );
}
