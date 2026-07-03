import { describe, it, expect } from 'vitest';
import { formatFrDate } from './formatDate';

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
