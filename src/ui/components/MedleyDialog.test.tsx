import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MedleyDialog } from './MedleyDialog';

describe('MedleyDialog — fixedBaseProFile (Texte personnalisé)', () => {
  it('masque le sélecteur de modèle et utilise le modèle fixe sans que l’utilisateur le choisisse', () => {
    const onSave = vi.fn();
    render(
      <MedleyDialog
        onClose={() => {}}
        onSave={onSave}
        fixedBaseProFile="J'entends ta douce voix - H&L 496.pro"
      />,
    );
    // Pas de sélecteur de modèle affiché.
    expect(screen.queryByText('Présentation modèle (mise en forme & fond)')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Choisir…' })).toBeNull();

    fireEvent.change(screen.getByPlaceholderText('Mon chant, mon verset…'), {
      target: { value: 'Bienvenue' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer' }));

    expect(onSave).toHaveBeenCalledWith({
      titre: 'Bienvenue',
      baseProFile: "J'entends ta douce voix - H&L 496.pro",
      slides: [],
    });
  });

  it('affiche le sélecteur de modèle pour un chant (fixedBaseProFile absent)', () => {
    render(<MedleyDialog onClose={() => {}} onSave={() => {}} />);
    expect(screen.getByText('Présentation modèle (mise en forme & fond)')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Choisir…' })).toBeInTheDocument();
  });
});
