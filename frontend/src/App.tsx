import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { PrivateRoute } from './routes/PrivateRoute';
import { AppLayout } from './components/layout/AppLayout';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import Dashboard from './pages/dashboard/Dashboard';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Routes publiques */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Routes protégées */}
          <Route element={<PrivateRoute />}>
            <Route element={<AppLayout />}>
              <Route path="/dashboard" element={<Dashboard />} />
              {/* Les modules suivants seront ajoutés ici au fil des itérations */}
              <Route path="/users" element={<PlaceholderPage title="Utilisateurs" />} />
              <Route path="/schools" element={<PlaceholderPage title="Écoles" />} />
              <Route path="/classes" element={<PlaceholderPage title="Classes" />} />
              <Route path="/grades" element={<PlaceholderPage title="Notes" />} />
              <Route path="/attendance" element={<PlaceholderPage title="Présences" />} />
              <Route path="/schedule" element={<PlaceholderPage title="Emploi du temps" />} />
              <Route path="/announcements" element={<PlaceholderPage title="Annonces" />} />
              <Route path="/settings" element={<PlaceholderPage title="Paramètres" />} />
            </Route>
          </Route>

          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

function PlaceholderPage({ title }: { title: string }) {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
      <p className="text-gray-500 mt-2">Module en cours de développement…</p>
    </div>
  );
}
