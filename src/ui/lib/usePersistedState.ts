import { useEffect, useState, type Dispatch, type SetStateAction } from 'react';

/**
 * useState dont la valeur est mémorisée dans localStorage (clé préfixée
 * `tramea.`) et relue au montage — pour des préférences UI simples
 * (réglages d'export, etc.), pas pour des données métier. Même API que
 * useState (accepte aussi la forme fonctionnelle `(prev) => next`).
 */
export function usePersistedState<T>(key: string, initial: T): [T, Dispatch<SetStateAction<T>>] {
  const storageKey = `tramea.${key}`;
  const [value, setValue] = useState<T>(() => {
    if (typeof localStorage === 'undefined') return initial;
    const saved = localStorage.getItem(storageKey);
    if (saved === null) return initial;
    try {
      return JSON.parse(saved) as T;
    } catch {
      return initial;
    }
  });

  useEffect(() => {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(storageKey, JSON.stringify(value));
  }, [storageKey, value]);

  return [value, setValue];
}
