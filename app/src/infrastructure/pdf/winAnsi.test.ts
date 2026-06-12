import { describe, it, expect } from 'vitest';
import { sanitizeWinAnsi } from './winAnsi';

describe('sanitizeWinAnsi', () => {
  it('conserve les accents français', () => {
    expect(sanitizeWinAnsi('Méditation à genoux, prière fidèle')).toBe(
      'Méditation à genoux, prière fidèle',
    );
  });

  it('remplace œ et les guillemets typographiques', () => {
    expect(sanitizeWinAnsi('Mon cœur t’adore « ouvre »')).toBe(
      "Mon coeur t'adore « ouvre »",
    );
  });

  it('remplace tirets longs et points de suspension', () => {
    expect(sanitizeWinAnsi('Agnus Dei — JEM 724…')).toBe('Agnus Dei - JEM 724...');
  });

  it('retire les caractères hors plage (emoji)', () => {
    expect(sanitizeWinAnsi('Louange 🙏 Dieu')).toBe('Louange  Dieu');
  });
});
