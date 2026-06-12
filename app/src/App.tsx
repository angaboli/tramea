import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './ui/Layout';
import { CreatorDashboard } from './ui/screens/CreatorDashboard';
import { ProgrammeEditor } from './ui/screens/ProgrammeEditor';
import { AdminPanel } from './ui/screens/AdminPanel';
import { setupAutosave } from './ui/lib/autosave';
import { useSavedProgrammes } from './ui/stores/savedProgrammes';
import { useLibrary } from './ui/stores/library';

/**
 * Routeur de l'application (rendu uniquement pour une session valide,
 * derrière l'AuthGate). À la connexion, on atterrit sur /creator.
 */
export default function App() {
  useEffect(() => {
    void useSavedProgrammes.getState().refresh();
    // Réutilise silencieusement le dossier ProPresenter déjà autorisé.
    void useLibrary.getState().restore();
    return setupAutosave();
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/creator" element={<CreatorDashboard />} />
          <Route path="/programme" element={<ProgrammeEditor mode="programme" />} />
          <Route path="/trame" element={<ProgrammeEditor mode="trame" />} />
          <Route path="/admin" element={<AdminPanel />} />
          {/* Tout le reste mène au tableau de bord Creator. */}
          <Route path="*" element={<Navigate to="/creator" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
