/**
 * Récupère le texte biblique (Louis Segond 1910, domaine public) d'une
 * référence en français (ex. "Jean 3:16", "Psaume 23:1-4") via la fonction
 * serveur `/api/bible-verse` (proxy de getBible.net, sans clé requise).
 * Ne bloque jamais l'app : en cas d'échec, lève une erreur claire — l'appelant
 * peut laisser l'item tel quel (aucun texte pré-rempli) et continuer.
 */
export async function fetchVerseText(reference: string): Promise<{ text: string; reference: string }> {
  const response = await fetch(`/api/bible-verse?ref=${encodeURIComponent(reference)}`);

  if (!response.ok) {
    let message = 'Impossible de récupérer le texte biblique.';
    try {
      const body = await response.json();
      if (body?.error) message = body.error;
    } catch {
      // réponse non-JSON (ex. route absente en dev local) : message générique
    }
    throw new Error(message);
  }

  const data = await response.json();
  return { text: data.text as string, reference: data.reference as string };
}
