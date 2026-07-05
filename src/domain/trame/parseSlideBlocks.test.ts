import { describe, it, expect } from 'vitest';
import { parseSlideBlocks, serializeSlideBlocks } from './parseSlideBlocks';

describe('parseSlideBlocks', () => {
  it('sépare les blocs par ligne vide, sans étiquette', () => {
    const blocks = parseSlideBlocks('Strophe 1\nligne 2\n\nRefrain\nligne 2');
    expect(blocks).toEqual([
      { text: 'Strophe 1\nligne 2', group: undefined },
      { text: 'Refrain\nligne 2', group: undefined },
    ]);
  });

  it('extrait l’étiquette #Nom en tête de bloc', () => {
    const blocks = parseSlideBlocks(
      '#Couplet 1\nToujours ta divine présence\nQue Dieu conduise mes pas\n\n#Refrain\nOù tu voudras je veux te suivre',
    );
    expect(blocks).toEqual([
      { text: 'Toujours ta divine présence\nQue Dieu conduise mes pas', group: 'Couplet 1' },
      { text: 'Où tu voudras je veux te suivre', group: 'Refrain' },
    ]);
  });

  it('mélange blocs étiquetés et non étiquetés', () => {
    const blocks = parseSlideBlocks('#Couplet 1\nligne\n\nsans étiquette');
    expect(blocks).toEqual([
      { text: 'ligne', group: 'Couplet 1' },
      { text: 'sans étiquette', group: undefined },
    ]);
  });

  it('ignore les blocs vides', () => {
    expect(parseSlideBlocks('texte\n\n\n\nautre')).toEqual([
      { text: 'texte', group: undefined },
      { text: 'autre', group: undefined },
    ]);
  });

  it('texte vide → []', () => {
    expect(parseSlideBlocks('')).toEqual([]);
  });
});

describe('serializeSlideBlocks', () => {
  it('reconstruit le texte avec les étiquettes', () => {
    const text = serializeSlideBlocks(['ligne1', 'ligne2'], ['Couplet 1', 'Refrain']);
    expect(text).toBe('#Couplet 1\nligne1\n\n#Refrain\nligne2');
  });

  it('sans étiquette pour un bloc donné : pas de préfixe', () => {
    const text = serializeSlideBlocks(['a', 'b'], ['Couplet 1', undefined]);
    expect(text).toBe('#Couplet 1\na\n\nb');
  });

  it('sans groupes du tout : texte brut', () => {
    expect(serializeSlideBlocks(['a', 'b'])).toBe('a\n\nb');
  });

  it('aller-retour parse/serialize stable', () => {
    const original = '#Couplet 1\nligne a\n\n#Refrain\nligne b\n\nsans étiquette';
    const blocks = parseSlideBlocks(original);
    const text = serializeSlideBlocks(
      blocks.map((b) => b.text),
      blocks.map((b) => b.group),
    );
    expect(parseSlideBlocks(text)).toEqual(blocks);
  });
});
