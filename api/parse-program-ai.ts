import { GoogleGenAI, Type } from "@google/genai";

const programmeSchema = {
  type: Type.OBJECT,
  properties: {
    titre: { type: Type.STRING },
    date: {
      type: Type.STRING,
      description: "Format ISO strict yyyy-mm-dd. Si introuvable, utilise obligatoirement la date du jour.",
    },
    sections: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          label: {
            type: Type.STRING,
            description: "Nom de la section (ex: Louange, Predication, Cloture, Accueil). Respecte les separateurs deja presents s'il y en a.",
          },
          items: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                type: {
                  type: Type.STRING,
                  description: 'Met "song" UNIQUEMENT pour les chants/cantiques. Met "label" pour tout le reste (priere, sermon, annonces...).',
                },
                titre: { type: Type.STRING },
                ref: {
                  type: Type.STRING,
                  description: "Reference exacte du chant (ex: H&L 134, JEM 87, DLG 45).",
                },
                tonalite: {
                  type: Type.STRING,
                  description: "Tonalite musicale si elle est mentionnee.",
                },
                officiant: {
                  type: Type.STRING,
                  description: "Nom de l'intervenant ou responsable.",
                },
                note: {
                  type: Type.STRING,
                  description: "Consignes de jeu, indications d'execution ou remarques humaines (exemples : Medley, Durant la distribution, Avec expression, Chante assis)."
                },
                verset: {
                  type: Type.STRING,
                  description: "Passage ou texte si et seulement s'il provient directement de la Bible (ex: Psaume 23, Jean 3:16). Ne jamais mettre de consignes humaines ou musicales ici.",
                },
                lien: { type: Type.STRING, description: "URL si mentionnee." },
              },
              required: ["type", "titre"],
            },
          },
        },
        required: ["label", "items"],
      },
    },
  },
  required: ["titre", "date", "sections"],
};

const SYSTEM_INSTRUCTION = `
ROLE :
Tu es un assistant specialise dans l'analyse et l'extraction de donnees a partir de programmes de culte adventiste. Ton but est de transformer le texte brut en un format structure conforme au schema fourni.

REGLES METIERS IMPORTANTES :
- type : Utilise "song" uniquement pour les chants ou cantiques. Pour absolument tout le reste (priere, sermon, annonces, histoire, offrandes), utilise "label".
- sections : Regroupe les elements en blocs coherents. Si le texte d'origine possede deja des titres de sections clairs, tu dois obligatoirement les conserver et les respecter.
- "verset" vs "note" : Si une information textuelle provient de la Bible (comme une lecture ou une reference de texte), place-la dans "verset". Si c'est une consigne humaine ou une remarque, place-la dans "note".

CONSIGNES DE SORTIE :
- Si une information optionnelle est absente du texte brut, retire completement le champ du resultat final (ne pas laisser vide, ne pas mettre null).
- Produis uniquement le resultat structure attendu, sans texte avant ou apres.
`.trim();

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        error: "GEMINI_API_KEY manquante sur le serveur",
      });
    }

    const { text } = req.body as { text?: string };

    if (!text || typeof text !== "string") {
      return res.status(400).json({
        error: 'Le champ "text" est requis',
      });
    }

    const ai = new GoogleGenAI({ apiKey });

    const response = await ai.models.generateContent({
      model: "gemini-flash-latest",
      contents: `Voici le texte extrait du programme de culte :\n\n${text}`,
      config: {
        responseMimeType: "application/json",
        responseSchema: programmeSchema,
        systemInstruction: SYSTEM_INSTRUCTION,
      },
    });

    const rawText = response.text?.trim();

    if (!rawText) {
      return res.status(502).json({
        error: "Réponse vide de Gemini",
      });
    }

    const parsed = JSON.parse(rawText);

    return res.status(200).json(parsed);
  } catch (error) {
    console.error("Erreur parse-program-ai:", error);

    return res.status(500).json({
      error:
        error instanceof Error
          ? error.message
          : "Erreur inconnue lors du parsing IA",
    });
  }
}
