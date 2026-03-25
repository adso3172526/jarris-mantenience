import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import esES from 'antd/locale/es_ES';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { theme } from './config/theme';
import CategoriesPage from './pages/Categories/CategoriesPage';
import LocationsPage from './pages/Locations/LocationsPage';
import WorkOrdersPage from './pages/WorkOrders/WorkOrdersPage';
import ReportsPage from './pages/Reports/ReportsPage';
import UsersPage from './pages/Users/UsersPage';
import EventsPage from './pages/Events/EventsPage';
import LocativePage from './pages/Locative/LocativePage';
import TrasladosPage from './pages/Traslados/TrasladosPage';
import BajasPage from './pages/Bajas/BajasPage';
import LocativeCategoriesPage from './pages/LocativeCategories/LocativeCategoriesPage';

// Layouts
import MainLayout from './components/Layout/MainLayout';

// Pages
import LoginPage from './pages/Login/LoginPage';
import DashboardPage from './pages/Dashboard/DashboardPage';
import AssetsPage from './pages/Assets/AssetsPage';

// Redirige según el rol del usuario
const RoleRedirect: React.FC = () => {
  const { user } = useAuth();

  if (!user) return <Navigate to="/login" replace />;

  if (user.roles.includes('ADMIN') || user.roles.includes('JEFE_MANTENIMIENTO')) {
    return <Navigate to="/dashboard" replace />;
  } else {
    // TECNICO_INTERNO, CONTRATISTA, PDV, ADMINISTRACION
    return <Navigate to="/work-orders" replace />;
  }
};

// Protege rutas por rol: si no tiene permiso, redirige a su página principal
const RoleRoute: React.FC<{ roles: string[]; children: React.ReactElement }> = ({ roles, children }) => {
  const { hasRole } = useAuth();

  if (!hasRole(roles)) {
    return <RoleRedirect />;
  }

  return children;
};

function App() {
  return (
    <ConfigProvider theme={theme} locale={esES}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route
              path="/login"
              element={
                <PublicRoute>
                  <LoginPage />
                </PublicRoute>
              }
            />

            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <MainLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<RoleRedirect />} />
              <Route path="dashboard" element={
                <RoleRoute roles={['ADMIN', 'JEFE_MANTENIMIENTO']}>
                  <DashboardPage />
                </RoleRoute>
              } />
              <Route path="assets" element={
                <RoleRoute roles={['ADMIN', 'JEFE_MANTENIMIENTO', 'TECNICO_INTERNO', 'PDV', 'ADMINISTRACION']}>
                  <AssetsPage />
                </RoleRoute>
              } />
              <Route path="work-orders" element={<WorkOrdersPage />} />
              <Route path="events" element={
                <RoleRoute roles={['ADMIN', 'JEFE_MANTENIMIENTO', 'TECNICO_INTERNO']}>
                  <EventsPage />
                </RoleRoute>
              } />
              <Route path="locative" element={
                <RoleRoute roles={['ADMIN', 'JEFE_MANTENIMIENTO', 'TECNICO_INTERNO']}>
                  <LocativePage />
                </RoleRoute>
              } />
              <Route path="traslados" element={
                <RoleRoute roles={['ADMIN', 'JEFE_MANTENIMIENTO', 'TECNICO_INTERNO']}>
                  <TrasladosPage />
                </RoleRoute>
              } />
              <Route path="bajas" element={
                <RoleRoute roles={['ADMIN', 'JEFE_MANTENIMIENTO', 'TECNICO_INTERNO']}>
                  <BajasPage />
                </RoleRoute>
              } />
              <Route path="locative-categories" element={
                <RoleRoute roles={['ADMIN', 'JEFE_MANTENIMIENTO']}>
                  <LocativeCategoriesPage />
                </RoleRoute>
              } />
              <Route path="users" element={
                <RoleRoute roles={['ADMIN', 'JEFE_MANTENIMIENTO']}>
                  <UsersPage />
                </RoleRoute>
              } />
              <Route path="reports" element={
                <RoleRoute roles={['ADMIN', 'JEFE_MANTENIMIENTO']}>
                  <ReportsPage />
                </RoleRoute>
              } />
              <Route path="categories" element={
                <RoleRoute roles={['ADMIN', 'JEFE_MANTENIMIENTO']}>
                  <CategoriesPage />
                </RoleRoute>
              } />
              <Route path="locations" element={
                <RoleRoute roles={['ADMIN', 'JEFE_MANTENIMIENTO']}>
                  <LocationsPage />
                </RoleRoute>
              } />
            </Route>

            <Route path="*" element={<RoleRedirect />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ConfigProvider>
  );
}

// Componente para rutas protegidas
const ProtectedRoute: React.FC<{ children: React.ReactElement }> = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <div>Cargando...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

// Componente para rutas públicas (redirige si ya está autenticado)
const PublicRoute: React.FC<{ children: React.ReactElement }> = ({ children }) => {
  const { user, loading, hasRole } = useAuth();

  if (loading) {
    return <div>Cargando...</div>;
  }

  if (user) {
    if (hasRole(['ADMIN', 'JEFE_MANTENIMIENTO'])) {
      return <Navigate to="/dashboard" replace />;
    } else {
      return <Navigate to="/work-orders" replace />;
    }
  }

  return children;
};

export default App;
