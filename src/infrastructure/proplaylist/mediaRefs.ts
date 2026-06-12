/**
 * Extraction des noms de base des médias référencés dans un fichier `.pro`.
 * Port de `_media_basenames` (Python). On lit les octets en latin1 (1 octet =
 * 1 caractère) et on cherche les chemins se terminant par une extension média.
 */
const MEDIA_RE =
  /[\x20-\x7e\x80-\xff]{3,200}?\.(?:jpg|jpeg|png|mp4|mov|m4v|gif|webp|heic)/gi;

function toLatin1(data: Uint8Array): string {
  let s = '';
  for (let i = 0; i < data.length; i++) s += String.fromCharCode(data[i]);
  return s;
}

function basename(path: string): string {
  const parts = path.split(/[\\/]/);
  return parts[parts.length - 1].trim();
}

/** Noms de base (uniques) des médias référencés dans un `.pro`. */
export function mediaBasenames(proBytes: Uint8Array): string[] {
  const s = toLatin1(proBytes);
  const found = new Set<string>();
  for (const match of s.matchAll(MEDIA_RE)) {
    const base = basename(match[0]);
    if (base) found.add(base);
  }
  return [...found];
}
