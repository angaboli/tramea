/**
 * Décode des octets de fichier programme en texte exploitable :
 * - détecte l'encodage (UTF-16 LE/BE, UTF-8 via BOM) ;
 * - répare le mojibake fréquent des trames (accents stockés comme Ú/Þ/Û…).
 * Pur et testable.
 */

// Carte du mojibake observé (Latin-1 lu comme CP850) → caractère correct.
const MOJIBAKE: Record<string, string> = {
  Ú: 'é', Þ: 'è', Û: 'ê', Ô: 'â', Ó: 'à', Æ: '’', '£': 'œ', Ù: 'ù', Ï: 'î', Ò: 'ô',
};

export function decodeBytes(bytes: Uint8Array): string {
  if (bytes[0] === 0xff && bytes[1] === 0xfe) {
    return new TextDecoder('utf-16le').decode(bytes.subarray(2));
  }
  if (bytes[0] === 0xfe && bytes[1] === 0xff) {
    return new TextDecoder('utf-16be').decode(bytes.subarray(2));
  }
  if (bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    return new TextDecoder('utf-8').decode(bytes.subarray(3));
  }
  // Heuristique : beaucoup d'octets nuls au début ⇒ UTF-16 sans BOM.
  let zeros = 0;
  for (let i = 0; i < Math.min(200, bytes.length); i++) if (bytes[i] === 0) zeros++;
  if (zeros > 20) return new TextDecoder('utf-16le').decode(bytes);
  return new TextDecoder('utf-8').decode(bytes);
}

export function fixMojibake(text: string): string {
  // Si le texte contient déjà des minuscules accentuées, il est propre.
  // (Sensible à la casse : Û/Ô… sont justement des marqueurs de mojibake.)
  if (/[éèàùâêîôûçï]/.test(text)) return text;
  if (!/[ÚÞÛÔÓÆ£]/.test(text)) return text;
  let out = '';
  for (const ch of text) out += MOJIBAKE[ch] ?? ch;
  return out;
}

export function decodeProgram(bytes: Uint8Array): string {
  return fixMojibake(decodeBytes(bytes));
}
