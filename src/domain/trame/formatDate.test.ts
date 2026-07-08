import { describe, it, expect } from 'vitest';
import { formatFrDate, nextSaturday } from './formatDate';

describe('formatFrDate', () => {
  it('convertit ISO en jj/mm/aaaa', () => {
    expect(formatFrDate('2026-06-20')).toBe('20/06/2026');
    expect(formatFrDate('2026-01-05')).toBe('05/01/2026');
  });
  it('renvoie l’entrée telle quelle si invalide', () => {
    expect(formatFrDate('')).toBe('');
    expect(formatFrDate('20 juin')).toBe('20 juin');
    expect(formatFrDate(undefined)).toBe('');
  });
});

describe('nextSaturday', () => {
  it('renvoie le samedi de la semaine en cours si on n’y est pas encore', () => {
    expect(nextSaturday(new Date('2026-06-15T10:00:00'))).toBe('2026-06-20'); // lundi -> samedi
    expect(nextSaturday(new Date('2026-06-17T10:00:00'))).toBe('2026-06-20'); // mercredi -> samedi
    expect(nextSaturday(new Date('2026-06-14T10:00:00'))).toBe('2026-06-20'); // dimanche -> samedi
  });
  it('renvoie aujourd’hui même si on est déjà samedi', () => {
    expect(nextSaturday(new Date('2026-06-20T10:00:00'))).toBe('2026-06-20');
  });
});
