import type { ItemType } from './types';

/**
 * Moment liturgique récurrent — présent dans la trame mais rarement détaillé
 * dans le programme imprimé (Annonces, Prélude…). Ajoutable en 1 clic depuis
 * une section (« Moments courants »).
 *
 * `matchKeys` (optionnel) : noms de fichier `.pro` candidats (accents/casse
 * ignorés), essayés dans l'ordre — sert à PRÉ-LIER automatiquement la diapo-
 * titre correspondante si elle existe dans la bibliothèque connectée. Absent
 * pour les moments dont le contenu change chaque semaine (ex. Chant spécial) :
 * jamais de `.pro` par défaut, à lier à la main comme d'habitude.
 */
export interface RecurringMoment {
  label: string;
  type: ItemType;
  matchKeys?: readonly string[];
}

export const RECURRING_MOMENTS: readonly RecurringMoment[] = [
  { label: 'Prélude', type: 'label', matchKeys: ['prelude'] },
  { label: 'Bienvenue', type: 'label', matchKeys: ['bienvenue'] },
  { label: 'Entrée des officiants', type: 'label' },
  // Diapo dédiée fréquente : « Prière 2 » (distincte de la « Prière » générique
  // utilisée par les autres moments de prière) ; repli sur « Prière » sinon.
  { label: 'Invocation', type: 'label', matchKeys: ['invocation', 'priere 2', 'priere'] },
  { label: 'Annonces', type: 'label', matchKeys: ['annonces'] },
  // « Groupe de prière » est un intitulé alternatif fréquent pour Intercession.
  { label: 'Intercession', type: 'label', matchKeys: ['intercession', 'groupe de priere'] },
  { label: 'Prière', type: 'label', matchKeys: ['priere'] },
  // Pas de diapo dédiée « à genoux »/« finale » en général → repli sur la
  // diapo-titre générique « Prière » si elle existe.
  { label: 'Prière à genoux', type: 'label', matchKeys: ['priere a genoux', 'priere'] },
  { label: 'Service de fidélité', type: 'label', matchKeys: ['service de fidelite'] },
  { label: 'Message pour les enfants', type: 'label', matchKeys: ['message pour les enfants'] },
  { label: 'Méditation / Partage', type: 'label', matchKeys: ['meditation'] },
  // Chant différent chaque semaine : jamais de .pro par défaut.
  { label: 'Chant spécial', type: 'song' },
  // Contenu (le verset) différent chaque fois : jamais de .pro par défaut. Le
  // texte biblique réel se récupère via le bouton « Texte personnalisé » de
  // l'item (Louis Segond 1910, domaine public) puis se génère en diapo à
  // l'export, comme un chant personnalisé.
  { label: 'Verset biblique', type: 'label' },
  { label: 'Prière finale', type: 'label', matchKeys: ['priere finale', 'priere'] },
  { label: 'Bénédiction', type: 'label', matchKeys: ['benediction'] },
  { label: 'Postlude', type: 'label', matchKeys: ['postlude'] },
];

/** Rétro-compatibilité : simples libellés (si un appelant n'a besoin que du texte). */
export const RECURRING_LABELS: readonly string[] = RECURRING_MOMENTS.map((m) => m.label);
