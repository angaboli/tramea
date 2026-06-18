/**
 * Formatage de date — couche PURE (aucune dépendance).
 * Les dates sont STOCKÉES en ISO (yyyy-mm-dd) ; on les AFFICHE en français
 * jj/mm/aaaa. Pour les inputs `type="date"` et les noms de fichiers, on garde
 * l'ISO (format requis / sans « / »).
 */

/** ISO (yyyy-mm-dd) → français jj/mm/aaaa. Entrée invalide renvoyée telle quelle. */
export function formatFrDate(iso: string | undefined | null): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec((iso ?? '').trim());
  if (!m) return iso ?? '';
  return `${m[3]}/${m[2]}/${m[1]}`;
}
