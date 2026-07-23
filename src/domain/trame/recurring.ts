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
  /**
   * Repli si `matchKeys` ne trouve rien : nom de fichier `.pro` par PRÉFIXE
   * (accents/casse ignorés), le PREMIER par ordre alphabétique. Sert aux moments
   * dont la diapo réelle a un suffixe variable (« TEMOIGNAGE - <nom> »,
   * « CHANT SPECIAL - <nom> ») : on met une diapo qui ressemble plutôt qu'un
   * chant vide. À lier/changer à la main ensuite si besoin.
   */
  matchPrefix?: readonly string[];
}

export const RECURRING_MOMENTS: readonly RecurringMoment[] = [
  { label: 'École du sabbat', type: 'label', matchKeys: ['ecole du sabbat'] },
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
  // Pas de diapo-titre dédiée : on met la première diapo « Témoignage » /
  // « Chant spécial » qui ressemble (suffixe = nom de la personne), à ajuster.
  { label: 'Témoignages', type: 'label', matchPrefix: ['temoignage'] },
  { label: 'Morceau instrumental', type: 'label', matchPrefix: ['chant special'] },
  // Pas de diapo dédiée « à genoux »/« finale » en général → repli sur la
  // diapo-titre générique « Prière » si elle existe.
  { label: 'Prière à genoux', type: 'label', matchKeys: ['priere a genoux', 'priere'] },
  { label: 'Service de fidélité', type: 'label', matchKeys: ['service de fidelite'] },
  { label: 'Message pour les enfants', type: 'label', matchKeys: ['message pour les enfants'] },
  { label: 'Méditation / Partage', type: 'label', matchKeys: ['meditation'] },
  // Chant différent chaque semaine : pas de titre fixe, mais on évite un chant
  // vide en mettant une diapo « Chant spécial » qui ressemble (à changer).
  { label: 'Chant spécial', type: 'song', matchPrefix: ['chant special'] },
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

/**
 * Modèle FIXE cloné pour tout « Texte personnalisé » (item de type texte, pas
 * chant) — plus de choix de présentation modèle à faire : plus simple, et évite
 * d'exposer un réglage (le « fond ») qui n'apporte pas de valeur ici. On part
 * d'un modèle NEUTRE dédié au texte biblique (`Verset biblique.pro`) plutôt que
 * d'un cantique : le fond correspond au verset et rien du chant de base ne fuite.
 */
export const CUSTOM_TEXT_BASE_PRO_FILE = 'Verset biblique.pro';
