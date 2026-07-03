import type { ItemType, Programme, Section, TrameItem } from "../../domain/trame/types";

const uid = () => crypto.randomUUID();

export async function parseProgramText(text: string): Promise<Programme> {
  const response = await fetch("/api/parse-program-ai", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ text }),
  });

  if (!response.ok) {
    let message = "Erreur lors de l'appel à l'API Gemini";

    try {
      const errorBody = await response.json();
      if (errorBody?.error) {
        message = errorBody.error;
      }
    } catch {
      // ignore JSON parse error
    }

    throw new Error(message);
  }

  const programme = await response.json();
  return hydraterProgramme(programme);
}


function hydraterProgramme(raw: { titre: "string", date: "string", sections: Section[] }): Programme {
  return {
    id: uid(),
    titre: raw.titre,
    date: raw.date,
    sections: raw.sections.map((s: Section): Section => ({
      id: uid(),
      label: s.label,
      items: s.items.map((item: TrameItem): TrameItem => ({
        id: uid(),
        type: item.type as ItemType,
        titre: item.titre,
        ...(item.ref && { ref: item.ref }),
        ...(item.tonalite && { tonalite: item.tonalite }),
        ...(item.officiant && { officiant: item.officiant }),
        ...(item.note && { note: item.note }),
        ...(item.verset && { verset: item.verset }),
        ...(item.lien && { lien: item.lien }),
      })),
    })),
  };
}


