import { describe, it, expect } from 'vitest';
import { decodeBytes, fixMojibake, decodeProgram } from './decodeText';

function utf16le(s: string, bom = true): Uint8Array {
  const body = new Uint8Array(s.length * 2);
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    body[i * 2] = c & 0xff;
    body[i * 2 + 1] = c >> 8;
  }
  if (!bom) return body;
  return new Uint8Array([0xff, 0xfe, ...body]);
}

describe('decodeBytes', () => {
  it('décode UTF-16 LE avec BOM', () => {
    expect(decodeBytes(utf16le('Prélude'))).toBe('Prélude');
  });
  it('décode UTF-8 par défaut', () => {
    expect(decodeBytes(new TextEncoder().encode('Bénédiction'))).toBe('Bénédiction');
  });
});

describe('fixMojibake', () => {
  it('répare les accents corrompus', () => {
    expect(fixMojibake('PrÚsence, priÞre, tempÛte')).toBe('Présence, prière, tempête');
  });
  it('répare l’apostrophe et œ', () => {
    expect(fixMojibake('JÆai un c£ur')).toBe('J’ai un cœur');
  });
  it('ne touche pas un texte déjà correct', () => {
    expect(fixMojibake('Déjà éprouvé')).toBe('Déjà éprouvé');
  });
});

describe('decodeProgram', () => {
  it('combine décodage + réparation (UTF-16 mojibaké)', () => {
    expect(decodeProgram(utf16le('SÚance de priÞre'))).toBe('Séance de prière');
  });
});
