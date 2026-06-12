/**
 * Parse un programme de culte (texte issu d'un .md / .txt / .pdf) en Programme.
 * Port pragmatique de `program_reader.py` : sections, lignes de tableau,
 * références de recueil, classification chant/libellé, arrêt aux paroles.
 * PUR : aucune dépendance disque/réseau.
 */
import type { Programme, Section, ItemType } from '../trame/types';

const uid = () => crypto.randomUUID();

const CAT_RE =
  /\b(H\s*&\s*L|H&L|HL|JEM\s*KIDS|JEMK|JEM|ATG|DLG|AF|UAGF|EDS)\s*[-–]?\s*(\d{1,4})\b/i;

const KEY_RE =
  /^(do|re|ré|mi|fa|sol|la|si|ut)\s*[#b]?\s*(?:(?:->|→|>)\s*(do|re|ré|mi|fa|sol|la|si|ut)\s*[#b]?)?$/i;

const PERSON_RE = /^[A-ZÀ-Ÿ][\wÀ-ÿ'’-]+(\s+[A-ZÀ-Ÿ]\.?)?$/;

const SECTION_MAP: Record<string, string> = {
  'ecole du sabbat': 'ÉCOLE DU SABBAT',
  'culte d adoration': "CULTE D'ADORATION",
  'temps de louanges': 'TEMPS DE LOUANGES',
  'temps de louange': 'TEMPS DE LOUANGES',
  annonces: 'ANNONCES',
  intercession: 'INTERCESSION',
  prelude: 'PRÉLUDE',
  'pre culte': 'PRE-CULTE',
  'post culte': 'POST-CULTE',
  postlude: 'POSTLUDE',
  'priere a genoux': 'PRIÈRE À GENOUX',
  'service de fidelite': 'SERVICE DE FIDÉLITÉ',
  'message des enfants': 'MESSAGE DES ENFANTS',
  meditation: 'MÉDITATION',
  benediction: 'BÉNÉDICTION',
};

const LITURGY = [
  'prelude', 'postlude', 'bienvenue', 'entree des officiants', 'entree',
  'invocation', 'temoignage', 'meditation', 'partage', 'priere', 'priere finale',
  'priere a genoux', 'benediction', 'message pour les enfants', 'message des enfants',
  'histoire des enfants', 'annonces', 'annonce', 'lecture', 'offrande',
  'service de fidelite', 'intercession', 'predication', 'accueil', 'chant d envoi',
];

const DOC_HEADERS = ['eglise', 'adventiste', 'paroisse', 'programme du culte'];

const MONTHS: Record<string, number> = {
  janvier: 1, fevrier: 2, mars: 3, avril: 4, mai: 5, juin: 6,
  juillet: 7, aout: 8, septembre: 9, octobre: 10, novembre: 11, decembre: 12,
};

function norm(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function isLiturgy(t: string): boolean {
  const n = norm(t);
  return LITURGY.some((k) => n === k || n.startsWith(k + ' ') || n.startsWith(k));
}

function isKey(t: string): boolean {
  return KEY_RE.test(t.trim());
}
function isPerson(t: string): boolean {
  const w = t.trim().split(/\s+/);
  return w.length <= 2 && PERSON_RE.test(t.trim());
}

function extractRef(text: string): string {
  const m = text.match(CAT_RE);
  if (!m) return '';
  let p = m[1].toUpperCase().replace(/\s+/g, '');
  if (p === 'HL' || p === 'H&L') p = 'H&L';
  else if (p === 'JEMKIDS' || p === 'JEMK') p = 'JEM KIDS';
  return `${p} ${m[2]}`;
}

function sectionHeader(line: string): string | null {
  const raw = line.replace(/[#|]/g, '').trim();
  if (!raw) return null;
  const key = norm(raw);
  if (SECTION_MAP[key]) return SECTION_MAP[key];
  for (const [k, v] of Object.entries(SECTION_MAP)) {
    if (k.length >= 6 && (key.startsWith(k) || k.startsWith(key))) return v;
  }
  const letters = [...raw].filter((c) => /[a-zà-ÿ]/i.test(c));
  if (letters.length) {
    const up = letters.filter((c) => c === c.toUpperCase()).length / letters.length;
    if (up >= 0.7 && raw.length <= 40 && !raw.includes('|')) return raw;
  }
  return null;
}

function toIsoDate(raw: string): string {
  const m1 = raw.match(/(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})/);
  if (m1) {
    let [, d, mo, y] = m1;
    if (y.length === 2) y = '20' + y;
    return `${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  const m2 = norm(raw).match(/(\d{1,2})\s+([a-z]+)\s+(\d{4})/);
  if (m2 && MONTHS[m2[2]]) {
    return `${m2[3]}-${String(MONTHS[m2[2]]).padStart(2, '0')}-${m2[1].padStart(2, '0')}`;
  }
  return '';
}

export function parseProgramText(text: string): Programme {
  const lines = text.split(/\r?\n/);
  let date = '';
  let titre = '';
  const sections: Section[] = [];
  let current: Section | null = null;
  const seen = new Set<string>();

  for (const l of lines) {
    const s = l.trim();
    if (!s) continue;
    if (!date) {
      const m = s.match(/sabbat\s+(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})/i) ||
        s.match(/sabbat\s+(\d{1,2}\s+[a-zà-ÿ]+\s+\d{4})/i);
      if (m) date = toIsoDate(m[1]);
    }
    if (!titre && /eglise|adventiste/.test(norm(s))) {
      titre = s.replace(/\|/g, ' ').replace(/\s+/g, ' ').trim();
    }
  }

  const ensure = () => {
    if (!current) {
      current = { id: uid(), label: 'DIVERS', items: [] };
      sections.push(current);
    }
  };
  const add = (type: ItemType, t: string, ref?: string) => {
    ensure();
    current!.items.push({ id: uid(), type, titre: t, ref: ref || undefined });
  };

  for (const raw of lines) {
    const s = raw.trim();
    if (!s || s.startsWith('#')) continue;
    if (/^\s*\|?\s*[-:\s|]+\|?\s*$/.test(s) && s.includes('-')) continue;

    if (!s.includes('|')) {
      const hdr = sectionHeader(s);
      if (hdr) {
        const key = norm(hdr);
        if (seen.has(key) && sections.some((x) => x.items.length)) break; // paroles
        seen.add(key);
        current = { id: uid(), label: hdr, items: [] };
        sections.push(current);
        continue;
      }
    }

    if (raw.includes('|')) {
      const cells = raw.replace(/^\s*\|/, '').replace(/\|\s*$/, '').split('|').map((c) => c.trim());
      const nonEmpty = cells.filter(Boolean);
      if (!nonEmpty.length) continue;
      const rubric0 = nonEmpty[0];
      if (['titre', 'chant', 'element', 'rubrique'].includes(norm(rubric0))) continue;
      const rowRef = extractRef(raw);
      const rubric = rubric0.replace(CAT_RE, '').replace(/\s+/g, ' ').trim() || rubric0;

      let trailing = '';
      let trailingRef = '';
      for (const c of nonEmpty.slice(1)) {
        const cc = c.replace(CAT_RE, '').trim();
        if (!cc || isKey(cc) || isPerson(cc)) continue;
        if (cc.split(/\s+/).filter((w) => w.length > 1).length >= 2) {
          trailing = cc;
          trailingRef = extractRef(c);
          break;
        }
      }

      if (isLiturgy(rubric)) {
        add('label', rubric);
        if (trailing) add('song', trailing, trailingRef || rowRef);
      } else {
        add('song', rubric, extractRef(rubric0) || rowRef);
        if (trailing && norm(trailing) !== norm(rubric)) add('song', trailing, trailingRef);
      }
      continue;
    }

    // Ligne de texte simple
    if (s.length > 80) continue;
    const nl = norm(s);
    if (DOC_HEADERS.some((k) => nl.includes(k)) || /^sabbat\b/.test(nl)) continue;
    const ref = extractRef(s);
    const t = s.replace(CAT_RE, '').replace(/^[-–•·*\s]+/, '').replace(/[-–•·*\s]+$/, '').trim();
    if (!t) continue;
    add(isLiturgy(t) && !ref ? 'label' : 'song', t, ref);
  }

  return {
    id: uid(),
    date: date || new Date().toISOString().slice(0, 10),
    titre: titre || 'Programme importé',
    sections: sections.filter((x) => x.items.length),
  };
}
