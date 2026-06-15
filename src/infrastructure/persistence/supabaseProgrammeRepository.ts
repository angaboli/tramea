/**
 * Persistance des programmes/trames dans Supabase (table `programmes`).
 * Mode PARTAGÉ : tout le monde lit/écrit les mêmes enregistrements (accès
 * anonyme tant que l'auth est désactivée — voir migration *_programmes_shared).
 * Le Programme complet est stocké tel quel dans la colonne `data` (jsonb).
 */
import type { Programme } from '../../domain/trame/types';
import type {
  ProgrammeRepositoryPort,
  SavedProgramme,
} from '../../domain/ports/ProgrammeRepositoryPort';
import { supabase } from '../supabase/client';

interface ProgrammeRow {
  id: string;
  titre: string;
  date: string;
  data: Programme;
  updated_at: string;
}

export class SupabaseProgrammeRepository implements ProgrammeRepositoryPort {
  async save(programme: Programme): Promise<void> {
    if (!supabase) throw new Error('Supabase non configuré.');
    const { error } = await supabase.from('programmes').upsert(
      {
        id: programme.id,
        titre: programme.titre,
        date: programme.date,
        data: programme,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' },
    );
    if (error) throw new Error(error.message);
  }

  async list(): Promise<SavedProgramme[]> {
    if (!supabase) return [];
    const { data, error } = await supabase
      .from('programmes')
      .select('id, titre, date, data, updated_at')
      .order('updated_at', { ascending: false });
    if (error) throw new Error(error.message);
    return (data as ProgrammeRow[]).map((row) => ({
      programme: row.data,
      updatedAt: Date.parse(row.updated_at),
    }));
  }

  async get(id: string): Promise<Programme | null> {
    if (!supabase) return null;
    const { data, error } = await supabase
      .from('programmes')
      .select('data')
      .eq('id', id)
      .maybeSingle<{ data: Programme }>();
    if (error) throw new Error(error.message);
    return data?.data ?? null;
  }

  async remove(id: string): Promise<void> {
    if (!supabase) throw new Error('Supabase non configuré.');
    const { error } = await supabase.from('programmes').delete().eq('id', id);
    if (error) throw new Error(error.message);
  }
}
