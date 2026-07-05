import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ProgrammeEditor } from './ProgrammeEditor';
import { useSession } from '../stores/session';
import { useProgrammeEditor } from '../stores/programmeEditor';
import * as edit from '../../domain/trame/edit';

/**
 * Régression : un sélecteur Zustand qui renvoie un NOUVEAU tableau à chaque
 * rendu (ex. `.filter()` sans mémoïsation) fait boucler `useSyncExternalStore`
 * (Zustand v5) → React plante silencieusement → écran blanc en production.
 * Ce test échouerait (jsdom lève sur la boucle / dépassement de profondeur)
 * si ce bug revenait sur le sélecteur « autres sections » de l'éditeur.
 */
describe('ProgrammeEditor — trame (régression écran blanc)', () => {
  beforeEach(() => {
    useSession.setState({
      phase: 'authenticated',
      session: { email: 'admin@test', status: 'approved', role: 'admin' },
    });

    let p = edit.emptyProgramme('2026-06-20', 'Sabbat', 'trame');
    p = edit.addSection(p, 'ÉCOLE DU SABBAT');
    p = edit.addSection(p, "CULTE D'ADORATION");
    p = edit.addItem(p, p.sections[0].id, 'song', 'La voix de Christ');
    p = edit.addItem(p, p.sections[1].id, 'label', 'Bienvenue');
    useProgrammeEditor.setState({ programme: p });
  });

  it('affiche plusieurs sections avec items sans planter (rend le contenu, pas un écran blanc)', () => {
    render(
      <MemoryRouter>
        <ProgrammeEditor mode="trame" />
      </MemoryRouter>,
    );
    expect(screen.getByText('Éditeur de trame')).toBeInTheDocument();
    expect(screen.getByDisplayValue('La voix de Christ')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Bienvenue')).toBeInTheDocument();
    // Le sélecteur « Déplacer vers » n'apparaît que s'il y a d'autres sections.
    expect(screen.getAllByLabelText('Déplacer vers une autre section')).toHaveLength(2);
  });

  it('affiche le bouton de liaison .pro (📚) même sans dossier connecté', () => {
    render(
      <MemoryRouter>
        <ProgrammeEditor mode="trame" />
      </MemoryRouter>,
    );
    // Ne doit PAS disparaître silencieusement quand `library.ready` est faux
    // (bibliothèque non reconnectée après un rechargement).
    expect(screen.getAllByLabelText('Lier à la bibliothèque')).toHaveLength(2);
  });
});

describe('ProgrammeEditor — programme (lien .pro rétabli)', () => {
  beforeEach(() => {
    useSession.setState({
      phase: 'authenticated',
      session: { email: 'admin@test', status: 'approved', role: 'basic' },
    });

    let p = edit.emptyProgramme('2026-06-20', 'Sabbat', 'programme');
    p = edit.addSection(p, 'ÉCOLE DU SABBAT');
    p = edit.addItem(p, p.sections[0].id, 'song', 'La voix de Christ');
    useProgrammeEditor.setState({ programme: p });
  });

  it("propose de lier un fichier .pro (📚 et champ manuel), même en mode programme", () => {
    render(
      <MemoryRouter>
        <ProgrammeEditor mode="programme" />
      </MemoryRouter>,
    );
    expect(screen.getByLabelText('Lier à la bibliothèque')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Fichier .pro (via 📚)')).toBeInTheDocument();
    // L'outil medley/verset est aussi utile en programme (préparer le contenu
    // avant l'export .proPlaylist, qui reste réservé à la trame).
    expect(
      screen.getByTitle('Diapo personnalisée : chant, medley ou verset biblique'),
    ).toBeInTheDocument();
  });
});
