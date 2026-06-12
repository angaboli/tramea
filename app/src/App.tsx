import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './ui/Layout';
import { CreatorDashboard } from './ui/screens/CreatorDashboard';

/**
 * Routeur de l'application (rendu uniquement pour une session valide,
 * derrière l'AuthGate). À la connexion, on atterrit sur /creator.
 */
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/creator" element={<CreatorDashboard />} />
          {/* Tout le reste mène au tableau de bord Creator. */}
          <Route path="*" element={<Navigate to="/creator" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
