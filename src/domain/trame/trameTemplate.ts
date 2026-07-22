/**
 * Squelette chronologique d'une trame « à partir de zéro » — la structure
 * habituelle d'un culte (École du sabbat, Annonces, Intercession, Culte
 * d'adoration…), déjà en place, pour que créer une trame — même le jour J —
 * soit rapide : les moments récurrents sont pré-remplis (avec leur `.pro`
 * auto-lié s'il existe dans la bibliothèque connectée), et les emplacements
 * variables (chants) sont ajoutés VIDES, de type Chant, prêts à remplir.
 *
 * PUR : construit uniquement la structure (sections/items/titres). La liaison
 * aux fichiers `.pro` (recherche dans la bibliothèque) est un effet de bord
 * fait par l'appelant (UI), comme pour les presets de section existants.
 */
import type { Programme } from './types';
import * as edit from './edit';
import { RECURRING_MOMENTS } from './recurring';

export type TemplateItem = { moment: string } | { chant: true };

export interface TemplateSection {
  label: string;
  items: readonly TemplateItem[];
}

/**
 * Chronologie habituelle d'un culte — squelette partagé entre la trame « à
 * partir de zéro » (`buildTrameTemplate`) et la trame construite depuis un
 * programme importé (`buildTrameFromImport`), qui y distribue les chants scrappés.
 */
export const TRAME_CHRONOLOGY: readonly TemplateSection[] = [
  {
    label: 'ÉCOLE DU SABBAT',
    items: [{ chant: true }, { chant: true }],
  },
  {
    label: 'ANNONCES',
    items: [{ moment: 'Annonces' }],
  },
  {
    label: 'INTERCESSION',
    items: [{ moment: 'Intercession' }],
  },
  {
    label: "CULTE D'ADORATION",
    items: [
      { moment: 'Prélude' },
      { moment: 'Bienvenue' },
      { moment: 'Invocation' },
      { chant: true },
      { chant: true },
      { moment: 'Témoignages' },
      { moment: 'Morceau instrumental' },
      { chant: true },
      { moment: 'Prière à genoux' },
      { moment: 'Service de fidélité' },
      { moment: 'Message pour les enfants' },
      { moment: 'Méditation / Partage' },
      { moment: 'Chant spécial' },
      { moment: 'Prière finale' },
      { chant: true },
      { moment: 'Bénédiction' },
      { moment: 'Postlude' },
    ],
  },
];

const momentByLabel = new Map(RECURRING_MOMENTS.map((m) => [m.label, m]));

/**
 * Construit une trame vide selon la chronologie habituelle (voir ci-dessus).
 * Ne lie aucun `.pro` (fait ensuite par l'appelant, avec la bibliothèque).
 */
export function buildTrameTemplate(date: string, titre = ''): Programme {
  let p = edit.emptyProgramme(date, titre, 'trame');
  for (const section of TRAME_CHRONOLOGY) {
    p = edit.addSection(p, section.label);
    const sectionId = p.sections[p.sections.length - 1].id;
    for (const item of section.items) {
      if ('chant' in item) {
        p = edit.addItem(p, sectionId, 'song', '');
      } else {
        const moment = momentByLabel.get(item.moment);
        if (moment) p = edit.addItem(p, sectionId, moment.type, moment.label);
      }
    }
  }
  return p;
}
