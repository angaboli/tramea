/**
 * Extraction des paroles d'une présentation `.pro` (fichier local de
 * l'utilisateur). Les diapos ProPresenter stockent leur texte en RTF ; on
 * extrait chaque bloc RTF et on le convertit en texte brut. Pur et testable.
 */

function latin1(bytes: Uint8Array): string {
  let s = '';
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return s;
}

/** Convertit un fragment RTF en texte brut (lignes conservées). */
export function rtfToText(rtf: string): string {
  let s = rtf;
  // Retirer les tables d'en-tête (fonttbl/colortbl/…) et groupes ignorables.
  s = s.replace(/\{\\(?:\*\\)?(?:fonttbl|colortbl|stylesheet|expandedcolortbl|listtable|listoverridetable)\b[^{}]*\}/g, '');
  // Échappements unicode \uN et hexadécimaux \'xx.
  s = s.replace(/\\u(-?\d+)\s?\??/g, (_m, n) => String.fromCharCode(((Number(n) % 65536) + 65536) % 65536));
  s = s.replace(/\\'([0-9a-fA-F]{2})/g, (_m, h) => String.fromCharCode(parseInt(h, 16)));
  // Sauts de ligne / paragraphes.
  s = s.replace(/\\par[d]?\b/g, '\n').replace(/\\line\b/g, '\n');
  // Accolades échappées.
  s = s.replace(/\\([{}\\])/g, '$1');
  // Mots de contrôle restants.
  s = s.replace(/\\[a-zA-Z]+-?\d*\s?/g, '');
  // Accolades de groupe.
  s = s.replace(/[{}]/g, '');
  // Nettoyage des espaces, en gardant les retours à la ligne.
  return s
    .split('\n')
    .map((l) => l.replace(/[ \t]+/g, ' ').trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** Trouve les blocs `{\rtf …}` en comptant les accolades (échappées ignorées). */
function rtfBlocks(s: string): string[] {
  const out: string[] = [];
  let i = 0;
  while ((i = s.indexOf('{\\rtf', i)) !== -1) {
    let depth = 0;
    let end = -1;
    for (let j = i; j < s.length; j++) {
      const c = s[j];
      if (c === '\\') {
        j++; // ignore le caractère échappé suivant
      } else if (c === '{') {
        depth++;
      } else if (c === '}') {
        depth--;
        if (depth === 0) {
          end = j;
          break;
        }
      }
    }
    if (end === -1) break;
    out.push(s.slice(i, end + 1));
    i = end + 1;
  }
  return out;
}

/**
 * Paroles d'un `.pro` : un bloc de texte par diapo, dans l'ordre, en retirant
 * les doublons consécutifs (diapos répétées).
 */
export function extractLyrics(proBytes: Uint8Array): string[] {
  const s = latin1(proBytes);
  const blocks = rtfBlocks(s)
    .map(rtfToText)
    .filter((t) => t.length > 0);
  const out: string[] = [];
  for (const b of blocks) if (out[out.length - 1] !== b) out.push(b);
  return out;
}
