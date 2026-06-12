import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import { IdbProgrammeRepository } from './idbProgrammeRepository';
import type { Programme } from '../../domain/trame/types';

const prog = (id: string, titre: string): Programme => ({
  id,
  date: '2026-06-13',
  titre,
  sections: [{ id: 's1', label: 'EDS', items: [] }],
});

describe('IdbProgrammeRepository', () => {
  let repo: IdbProgrammeRepository;

  beforeEach(() => {
    // base isolée par test pour éviter les interférences
    repo = new IdbProgrammeRepository('tramea-test-' + Math.random(), 'programmes');
  });

  it('sauvegarde et relit un programme', async () => {
    await repo.save(prog('a', 'Sabbat A'));
    expect((await repo.get('a'))?.titre).toBe('Sabbat A');
  });

  it('met à jour un programme existant (même id)', async () => {
    await repo.save(prog('a', 'V1'));
    await repo.save(prog('a', 'V2'));
    const list = await repo.list();
    expect(list).toHaveLength(1);
    expect(list[0].programme.titre).toBe('V2');
  });

  it('liste, triée du plus récent au plus ancien', async () => {
    await repo.save(prog('a', 'A'));
    await new Promise((r) => setTimeout(r, 5));
    await repo.save(prog('b', 'B'));
    const list = await repo.list();
    expect(list.map((r) => r.programme.id)).toEqual(['b', 'a']);
  });

  it('supprime un programme', async () => {
    await repo.save(prog('a', 'A'));
    await repo.remove('a');
    expect(await repo.get('a')).toBeNull();
    expect(await repo.list()).toEqual([]);
  });
});
