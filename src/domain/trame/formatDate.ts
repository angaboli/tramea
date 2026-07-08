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

/**
 * Prochain samedi (jour du sabbat) en ISO — celui de la semaine en cours si
 * on n'y est pas encore, sinon aujourd'hui même si on est déjà samedi.
 * Sert de date par défaut à la création d'un programme/trame.
 */
export function nextSaturday(from: Date = new Date()): string {
  const d = new Date(from);
  const daysToAdd = (6 - d.getDay() + 7) % 7; // getDay() : 0=dimanche … 6=samedi
  d.setDate(d.getDate() + daysToAdd);
  return d.toISOString().slice(0, 10);
}
