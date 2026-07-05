/**
 * Extraction des paroles d'une présentation `.pro` (fichier local de
 * l'utilisateur). Les diapos ProPresenter stockent leur texte en RTF ; on
 * extrait chaque bloc RTF et on le convertit en texte brut PROPRE. Pur et
 * testable.
 */

export function latin1(bytes: Uint8Array): string {
  let s = '';
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return s;
}

// Octets hauts Windows-1252 (0x80–0x9F) qui ne correspondent PAS à Latin-1 :
// guillemets courbes, tirets, points de suspension… Sans cette table, ils
// sortaient en caractères illisibles.
const WIN1252: Record<number, string> = {
  0x80: '€', 0x82: '‚', 0x83: 'ƒ', 0x84: '„', 0x85: '…', 0x86: '†', 0x87: '‡',
  0x88: 'ˆ', 0x89: '‰', 0x8a: 'Š', 0x8b: '‹', 0x8c: 'Œ', 0x8e: 'Ž',
  0x91: '‘', 0x92: '’', 0x93: '“', 0x94: '”', 0x95: '•',
  0x96: '–', 0x97: '—', 0x98: '˜', 0x99: '™', 0x9a: 'š', 0x9b: '›', 0x9c: 'œ',
  0x9e: 'ž', 0x9f: 'Ÿ',
};

function decodeByte(code: number): string {
  return WIN1252[code] ?? String.fromCharCode(code);
}

// Octets de contrôle binaires résiduels (issus du protobuf autour du RTF) +
// caractère de remplacement Unicode : à supprimer du texte final.
// Construit par codes pour ne pas écrire d'octets de contrôle dans le source.
const CTRL = new RegExp(
  '[\\u0000-\\u0008\\u000B\\u000C\\u000E-\\u001F\\u007F\\uFFFD]',
  'g',
);

/**
 * Retire les groupes RTF « ignorables » (tables d'en-tête et destinations
 * `{\*\...}`) en comptant les accolades — y compris imbriquées. Leur contenu
 * (noms de polices, couleurs, styles) n'est pas du texte affiché.
 */
function stripIgnorableGroups(s: string): string {
  const IGNORE =
    /^\\(?:\*|fonttbl|colortbl|stylesheet|expandedcolortbl|listtable|listoverridetable|rsidtbl|generator|info|pgdsctbl|themedata|datastore)\b/;
  let out = '';
  for (let i = 0; i < s.length; i++) {
    if (s[i] === '{' && IGNORE.test(s.slice(i + 1, i + 24))) {
      // Saute le groupe entier (accolades équilibrées, échappées ignorées).
      let depth = 0;
      for (; i < s.length; i++) {
        const c = s[i];
        if (c === '\\') i++;
        else if (c === '{') depth++;
        else if (c === '}' && --depth === 0) break;
      }
      continue;
    }
    out += s[i];
  }
  return out;
}

/** Convertit un fragment RTF en texte brut PROPRE (lignes conservées). */
export function rtfToText(rtf: string): string {
  const s = stripIgnorableGroups(rtf);
  let out = '';
  let uc = 1; // nb de caractères de repli à sauter après un \uN (directive \ucN)
  let skip = 0;

  for (let i = 0; i < s.length; ) {
    const c = s[i];

    if (c === '\\') {
      const next = s[i + 1];
      // Échappement hexadécimal \'xx (un octet dans la code page).
      if (next === "'") {
        const code = parseInt(s.substr(i + 2, 2), 16);
        if (skip > 0) skip--;
        else if (!Number.isNaN(code)) out += decodeByte(code);
        i += 4;
        continue;
      }
      // Caractères littéraux échappés \{ \} \\
      if (next === '\\' || next === '{' || next === '}') {
        if (skip > 0) skip--;
        else out += next;
        i += 2;
        continue;
      }
      // Mot de contrôle : \word, paramètre optionnel, espace avalé.
      const m = /^\\([a-zA-Z]+)(-?\d+)? ?/.exec(s.slice(i));
      if (m) {
        const [tok, word, param] = m;
        if (word === 'u') {
          const code = ((Number(param) % 65536) + 65536) % 65536;
          out += String.fromCharCode(code);
          skip = uc; // les uc octets de repli suivants sont à ignorer
        } else if (word === 'uc') {
          uc = Number(param ?? '1');
        } else if (word === 'par' || word === 'pard' || word === 'line') {
          out += '\n';
          skip = 0;
        } else if (word === 'tab') {
          out += ' ';
        }
        // Tout autre mot de contrôle (mise en forme) est ignoré.
        i += tok.length;
        continue;
      }
      i++; // antislash isolé
      continue;
    }

    if (c === '{' || c === '}' || c === '\r') {
      i++;
      continue;
    }
    if (skip > 0 && c !== '\n') {
      skip--;
      i++;
      continue;
    }
    out += c;
    i++;
  }

  // Nettoyage final : retire les octets de contrôle, collapse les espaces.
  return out
    .split('\n')
    .map((l) => l.replace(CTRL, '').replace(/[ \t]+/g, ' ').trim())
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
 * Ne garde que les vraies lignes de paroles : on retire les lignes purement
 * décoratives (séparateurs ProPresenter type « *…*●…* », « „„ ») et les lignes
 * vides, pour un texte propre, lisible comme un poème.
 */
export function keepLyricLines(text: string): string {
  return text
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => /\p{L}/u.test(l)) // au moins une lettre = vraie parole
    .join('\n');
}

/**
 * Paroles d'un `.pro` : un bloc de texte par diapo, dans l'ordre, nettoyé des
 * lignes décoratives et des doublons consécutifs (diapos répétées).
 */
export function extractLyrics(proBytes: Uint8Array): string[] {
  const s = latin1(proBytes);
  const blocks = rtfBlocks(s)
    .map(rtfToText)
    .map(keepLyricLines)
    .filter((t) => t.length > 0);
  const out: string[] = [];
  for (const b of blocks) if (out[out.length - 1] !== b) out.push(b);
  return out;
}
