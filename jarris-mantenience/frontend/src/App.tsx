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

// Redirige según el rol/perfil del usuario
const RoleRedirect: React.FC = () => {
  const { user, hasAccess } = useAuth();

  if (!user) return <Navigate to="/login" replace />;

  if (
    hasAccess(['ADMIN', 'JEFE_MANTENIMIENTO'], ['VER_DASHBOARD'])
  ) {
    return <Navigate to="/dashboard" replace />;
  } else {
    return <Navigate to="/work-orders" replace />;
  }
};

// Protege rutas por rol y/o permiso
const RoleRoute: React.FC<{
  roles: string[];
  permissions?: string[];
  children: React.ReactElement;
}> = ({ roles, permissions, children }) => {
  const { hasAccess } = useAuth();

  if (!hasAccess(roles, permissions)) {
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
                <RoleRoute roles={['ADMIN', 'JEFE_MANTENIMIENTO']} permissions={['VER_DASHBOARD']}>
                  <DashboardPage />
                </RoleRoute>
              } />
              <Route path="assets" element={
                <RoleRoute roles={['ADMIN', 'JEFE_MANTENIMIENTO', 'TECNICO_INTERNO', 'PDV', 'ADMINISTRACION']} permissions={['VER_ACTIVOS']}>
                  <AssetsPage />
                </RoleRoute>
              } />
              <Route path="work-orders" element={<WorkOrdersPage />} />
              <Route path="events" element={
                <RoleRoute roles={['ADMIN', 'JEFE_MANTENIMIENTO', 'TECNICO_INTERNO']} permissions={['VER_EVENTOS']}>
                  <EventsPage />
                </RoleRoute>
              } />
              <Route path="locative" element={
                <RoleRoute roles={['ADMIN', 'JEFE_MANTENIMIENTO', 'TECNICO_INTERNO']} permissions={['VER_ACTIVOS']}>
                  <LocativePage />
                </RoleRoute>
              } />
              <Route path="traslados" element={
                <RoleRoute roles={['ADMIN', 'JEFE_MANTENIMIENTO', 'TECNICO_INTERNO']} permissions={['VER_TRASLADOS', 'CREAR_TRASLADOS', 'EDITAR_TRASLADOS']}>
                  <TrasladosPage />
                </RoleRoute>
              } />
              <Route path="bajas" element={
                <RoleRoute roles={['ADMIN', 'JEFE_MANTENIMIENTO', 'TECNICO_INTERNO']} permissions={['VER_BAJAS']}>
                  <BajasPage />
                </RoleRoute>
              } />
              <Route path="locative-categories" element={
                <RoleRoute roles={['ADMIN', 'JEFE_MANTENIMIENTO']} permissions={['VER_CATEGORIAS_LOCATIVOS']}>
                  <LocativeCategoriesPage />
                </RoleRoute>
              } />
              <Route path="users" element={
                <RoleRoute roles={['ADMIN', 'JEFE_MANTENIMIENTO']} permissions={['CREAR_USUARIOS']}>
                  <UsersPage />
                </RoleRoute>
              } />
              <Route path="reports" element={
                <RoleRoute roles={['ADMIN', 'JEFE_MANTENIMIENTO']} permissions={['GENERAR_REPORTES']}>
                  <ReportsPage />
                </RoleRoute>
              } />
              <Route path="categories" element={
                <RoleRoute roles={['ADMIN', 'JEFE_MANTENIMIENTO']} permissions={['VER_CATEGORIAS_ACTIVOS']}>
                  <CategoriesPage />
                </RoleRoute>
              } />
              <Route path="locations" element={
                <RoleRoute roles={['ADMIN', 'JEFE_MANTENIMIENTO']} permissions={['VER_UBICACIONES']}>
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
  const { user, loading, hasAccess } = useAuth();

  if (loading) {
    return <div>Cargando...</div>;
  }

  if (user) {
    if (hasAccess(['ADMIN', 'JEFE_MANTENIMIENTO'], ['VER_DASHBOARD'])) {
      return <Navigate to="/dashboard" replace />;
    } else {
      return <Navigate to="/work-orders" replace />;
    }
  }

  return children;
};

export default App;
