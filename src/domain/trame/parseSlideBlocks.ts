/**
 * Zone « Diapos » du dialogue Texte personnalisé / Créer un chant : un bloc
 * séparé par une ligne vide = une diapo. Convention d'étiquetage de groupe
 * (Couplet, Refrain…) : une ligne `#Nom du groupe` en tête de bloc.
 * PUR, testable, aucune dépendance UI.
 */

export interface SlideBlock {
  /** Texte de la diapo (sans la ligne d'étiquette). */
  text: string;
  /** Étiquette de groupe (« Couplet 1 », « Refrain »…), si présente. */
  group?: string;
}

const GROUP_LINE = /^#\s*(.+)$/;

/** Découpe le texte de la zone « Diapos » en blocs, en extrayant l'étiquette `#…` de chacun. */
export function parseSlideBlocks(text: string): SlideBlock[] {
  return text
    .split(/\n\s*\n/)
    .map((block) => {
      const lines = block.split('\n');
      const m = GROUP_LINE.exec(lines[0]?.trim() ?? '');
      const group = m ? m[1].trim() : undefined;
      const body = (m ? lines.slice(1) : lines).join('\n').trim();
      return { text: body, group };
    })
    .filter((b) => b.text.length > 0);
}

/** Reconstruit le texte de la zone « Diapos » à partir de diapos + étiquettes (édition). */
export function serializeSlideBlocks(slides: readonly string[], groups?: readonly (string | undefined)[]): string {
  return slides
    .map((s, i) => {
      const g = groups?.[i];
      return g ? `#${g}\n${s}` : s;
    })
    .join('\n\n');
}
