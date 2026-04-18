import { Routes, Route } from 'react-router-dom';
import Login from './pages/Login.jsx';
import Home from './pages/Home.jsx';
import OpsManager from './pages/OpsManager.jsx';
import QCCenter from './pages/QCCenter.jsx';
import TeamTools from './pages/TeamTools.jsx';
import Analytics from './pages/Analytics.jsx';
import ContentLibrary from './pages/ContentLibrary.jsx';
import Settings from './pages/Settings.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Home />
          </ProtectedRoute>
        }
      />
      <Route
        path="/ops"
        element={
          <ProtectedRoute allow={['ceo', 'operations']}>
            <OpsManager />
          </ProtectedRoute>
        }
      />
      <Route
        path="/qc"
        element={
          <ProtectedRoute allow={['ceo', 'operations']}>
            <QCCenter />
          </ProtectedRoute>
        }
      />
      <Route
        path="/tools"
        element={
          <ProtectedRoute>
            <TeamTools />
          </ProtectedRoute>
        }
      />
      <Route
        path="/analytics"
        element={
          <ProtectedRoute allow={['ceo', 'operations']}>
            <Analytics />
          </ProtectedRoute>
        }
      />
      <Route
        path="/library"
        element={
          <ProtectedRoute>
            <ContentLibrary />
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings"
        element={
          <ProtectedRoute allow={['ceo', 'operations']}>
            <Settings />
          </ProtectedRoute>
        }
      />

      <Route
        path="*"
        element={
          <ProtectedRoute>
            <Home />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}
