/**
 * Proxy serveur vers l'API getBible (https://getbible.net) — Bible Louis
 * Segond (1910), traduction FRANÇAISE du DOMAINE PUBLIC (pas de droits
 * d'auteur). Aucune clé requise. Le proxy évite le CORS (appel serveur→serveur)
 * et centralise la traduction utilisée.
 *
 * L'API comprend nativement les références en français avec plages
 * ("Jean 3:16", "Jean 3:16-18", "Psaume 23") — pas de parsing à faire ici.
 */
const GETBIBLE_BASE = "https://query.getbible.net/v2/ls1910/";

interface GetBibleVerse {
  verse: number;
  text: string;
}
interface GetBibleResponse {
  book_name?: string;
  chapter?: number;
  verses?: GetBibleVerse[];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default async function handler(req: any, res: any) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const ref = (req.query?.ref as string | undefined)?.trim();
  if (!ref) {
    return res.status(400).json({ error: 'Le paramètre "ref" est requis.' });
  }

  try {
    const upstream = await fetch(`${GETBIBLE_BASE}${encodeURIComponent(ref)}`);
    if (!upstream.ok) {
      return res.status(502).json({ error: "Service biblique indisponible." });
    }

    const data = (await upstream.json()) as GetBibleResponse;
    const verses = data.verses ?? [];
    if (verses.length === 0) {
      return res.status(404).json({ error: `Référence introuvable : « ${ref} ».` });
    }

    const text = verses.map((v) => v.text.trim()).join(" ");
    const reference =
      data.book_name && data.chapter ? `${data.book_name} ${data.chapter}` : ref;

    return res.status(200).json({ text, reference });
  } catch (error) {
    console.error("Erreur bible-verse:", error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : "Erreur inconnue lors de la récupération du verset",
    });
  }
}
