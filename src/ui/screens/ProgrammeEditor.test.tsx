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
});
