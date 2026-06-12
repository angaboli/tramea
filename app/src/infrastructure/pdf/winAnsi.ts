/**
 * Rend une chaîne sûre pour les polices standard PDF (Helvetica, encodage WinAnsi).
 * Les lettres accentuées françaises (é è à ê ç ë ï ô û…) sont conservées ;
 * seuls les caractères hors WinAnsi (œ, guillemets typographiques, tirets longs,
 * points de suspension, emojis…) sont remplacés.
 */
const MAP: Record<string, string> = {
  Œ: 'OE',
  œ: 'oe',
  '’': "'",
  '‘': "'",
  '“': '"',
  '”': '"',
  '–': '-',
  '—': '-',
  '…': '...',
  ' ': ' ', // espace insécable
  ' ': ' ', // espace fine insécable
};

export function sanitizeWinAnsi(input: string): string {
  let out = '';
  for (const ch of input) {
    if (MAP[ch] !== undefined) {
      out += MAP[ch];
      continue;
    }
    out += ch.charCodeAt(0) <= 0xff ? ch : '';
  }
  return out;
}
