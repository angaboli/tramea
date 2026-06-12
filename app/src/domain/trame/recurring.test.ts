import { describe, it, expect } from 'vitest';
import { RECURRING_LABELS } from './recurring';

describe('RECURRING_LABELS', () => {
  it('contient les moments liturgiques clés', () => {
    for (const label of ['Prélude', 'Annonces', 'Bénédiction', 'Postlude']) {
      expect(RECURRING_LABELS).toContain(label);
    }
  });

  it('ne contient pas de doublon', () => {
    expect(new Set(RECURRING_LABELS).size).toBe(RECURRING_LABELS.length);
  });
});
