import React, { useEffect } from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useNavigate,
} from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { RoomsProvider } from './context/RoomsContext';
import { disconnectSocket } from './api/socket';
import Login from './components/Auth/Login';
import Register from './components/Auth/Register';
import MainLayout from './components/Layout/MainLayout';

const FullscreenLoader = ({ children }) => (
  <div className="fullscreen-loader">
    <div className="loader-col">
      <div className="spinner" />
      <span>{children}</span>
    </div>
  </div>
);

const PrivateRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <FullscreenLoader>Building your graph…</FullscreenLoader>;
  return user ? children : <Navigate to="/login" replace />;
};

const PublicOnly = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <FullscreenLoader>Checking session…</FullscreenLoader>;
  return user ? <Navigate to="/" replace /> : children;
};

const SocketLifecycle = () => {
  const { user } = useAuth();
  // When the user logs out we still want to cleanly drop the socket.
  useEffect(() => {
    if (!user) {
      disconnectSocket();
    }
  }, [user]);
  return null;
};

// Redirects unknown paths home so legacy bookmarks work
const NotFoundRedirect = () => {
  const navigate = useNavigate();
  useEffect(() => {
    navigate('/', { replace: true });
  }, [navigate]);
  return null;
};

const App = () => (
  <AuthProvider>
    <Router>
      <SocketLifecycle />
      <Routes>
        <Route
          path="/login"
          element={
            <PublicOnly>
              <Login />
            </PublicOnly>
          }
        />
        <Route
          path="/register"
          element={
            <PublicOnly>
              <Register />
            </PublicOnly>
          }
        />
        <Route
          path="/"
          element={
            <PrivateRoute>
              <RoomsProvider>
                <MainLayout />
              </RoomsProvider>
            </PrivateRoute>
          }
        />
        <Route path="*" element={<NotFoundRedirect />} />
      </Routes>
    </Router>
  </AuthProvider>
);

export default App;
