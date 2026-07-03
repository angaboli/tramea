/**
 * Index PARTAGÉ de la bibliothèque (noms de fichiers `.pro` uniquement, pas
 * les médias) — table `library_songs`. Permet de chercher/lier un chant
 * depuis n'importe quel poste sans reconnecter le dossier local à chaque
 * fois. Publication explicite (bouton) : pas de synchro automatique, « pas
 * besoin de demander la synchro sauf si on en a besoin ».
 */
import type { LibrarySong } from '../../domain/library/song';
import { supabase } from './client';

interface LibrarySongRow {
  name: string;
  rel_path: string;
}

/** Remplace tout l'index partagé par la liste fournie (publication complète). */
export async function publishLibraryIndex(songs: readonly LibrarySong[]): Promise<void> {
  if (!supabase) throw new Error('Supabase non configuré.');

  const { error: delError } = await supabase
    .from('library_songs')
    .delete()
    .not('name', 'is', null);
  if (delError) throw new Error(delError.message);

  if (songs.length === 0) return;
  const rows = songs.map((s) => ({ name: s.name, rel_path: s.relPath }));
  const { error: insError } = await supabase.from('library_songs').insert(rows);
  if (insError) throw new Error(insError.message);
}

/** Lit l'index partagé (liste de noms), ou [] si Supabase non configuré. */
export async function fetchLibraryIndex(): Promise<LibrarySong[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.from('library_songs').select('name, rel_path');
  if (error) throw new Error(error.message);
  return ((data ?? []) as LibrarySongRow[]).map((r) => ({ name: r.name, relPath: r.rel_path }));
}
