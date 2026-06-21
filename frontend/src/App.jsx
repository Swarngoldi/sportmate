import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Home from './pages/Home';
import SelectPlayers from './pages/SelectPlayers';
import NearbyPlayers from './pages/NearbyPlayers';
import Courts from './pages/Courts';
import ConfirmMatch from './pages/ConfirmMatch';
import Chat from './pages/Chat';
import MyMatches from './pages/MyMatches';
import Profile from './pages/Profile';
import Notifications from './pages/Notifications';
import AppLocationSync from './components/AppLocationSync';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="app-shell"><div className="loading"><div className="spinner"></div></div></div>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="app-shell"><div className="loading"><div className="spinner"></div></div></div>;
  if (user) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppLocationSync />
        <Routes>
          <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
          <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
          <Route path="/forgot-password" element={<PublicRoute><ForgotPassword /></PublicRoute>} />
          <Route path="/reset-password/:token" element={<PublicRoute><ResetPassword /></PublicRoute>} />
          <Route path="/" element={<ProtectedRoute><Home /></ProtectedRoute>} />
          <Route path="/select-players" element={<ProtectedRoute><SelectPlayers /></ProtectedRoute>} />
          <Route path="/nearby-players" element={<ProtectedRoute><NearbyPlayers /></ProtectedRoute>} />
          <Route path="/courts" element={<ProtectedRoute><Courts /></ProtectedRoute>} />
          <Route path="/confirm" element={<ProtectedRoute><ConfirmMatch /></ProtectedRoute>} />
          <Route path="/chat/:matchId" element={<ProtectedRoute><Chat /></ProtectedRoute>} />
          <Route path="/matches" element={<ProtectedRoute><MyMatches /></ProtectedRoute>} />
          <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
