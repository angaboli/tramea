import type { Programme } from '../../domain/trame/types';
import type { ExportItem } from './exportProplaylist';

/**
 * Convertit un Programme en séquence d'éléments pour l'export .proPlaylist :
 * - chaque section → un bandeau (header) ;
 * - un chant avec `proFile` → un élément fichier ;
 * - un chant sans `proFile` → un repère « [A AJOUTER] » (header) ;
 * - un libellé liturgique → un header (diviseur texte).
 */
export function programmeToExportItems(programme: Programme): ExportItem[] {
  const out: ExportItem[] = [];
  for (const section of programme.sections) {
    out.push({ kind: 'header', label: section.label });
    for (const item of section.items) {
      const label = item.ref ? `${item.titre} - ${item.ref}` : item.titre;
      if (item.type === 'song' && item.proFile) {
        out.push({ kind: 'song', label, proFile: item.proFile });
      } else if (item.type === 'song') {
        out.push({ kind: 'header', label: `[A AJOUTER] ${label}` });
      } else {
        out.push({ kind: 'header', label: item.titre });
      }
    }
  }
  return out;
}
