import React from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { LandingPage } from '@/components/LandingPage';
import { Lobby } from '@/components/Lobby';
import { GameRoom } from '@/components/GameRoom';
import { StatsPage } from '@/components/StatsPage';
import { LoginPage, RegisterPage } from '@/pages/AuthPage';
import { useAuth } from '@/context/AuthContext';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) return <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">Loading...</div>;

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

const App: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      <Route path="/lobby" element={
        <ProtectedRoute>
          <Lobby />
        </ProtectedRoute>
      } />

      <Route path="/game/:roomId" element={
        <ProtectedRoute>
          <GameRoom />
        </ProtectedRoute>
      } />

      <Route path="/stats" element={
        <ProtectedRoute>
          <StatsPage />
        </ProtectedRoute>
      } />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default App;