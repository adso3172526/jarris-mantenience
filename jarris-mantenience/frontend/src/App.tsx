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
import EventosPage from './pages/Eventos/EventosPage';
import BajasPage from './pages/Bajas/BajasPage';

// Layouts
import MainLayout from './components/Layout/MainLayout';

// Pages
import LoginPage from './pages/Login/LoginPage';
import DashboardPage from './pages/Dashboard/DashboardPage';
import AssetsPage from './pages/Assets/AssetsPage'; 


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
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<DashboardPage />} />
              
              <Route path="assets" element={<AssetsPage />} />  {/* 👈 CAMBIADO */}
              
              <Route path="work-orders" element={<WorkOrdersPage />} />
              <Route path="events" element={<EventsPage />} />
              <Route path="locative" element={<LocativePage />} />
              <Route path="eventos" element={<EventosPage />} />
              <Route path="bajas" element={<BajasPage />} />
              
              <Route path="users" element={<UsersPage />} />
              <Route path="reports" element={<ReportsPage />} />
			  <Route path="categories" element={<CategoriesPage />} />
              <Route path="locations" element={<LocationsPage />} />
			  <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/reports" element={<ReportsPage />} />
            </Route>

            <Route path="*" element={<Navigate to="/dashboard" replace />} />
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
  const { user, loading } = useAuth();

  if (loading) {
    return <div>Cargando...</div>;
  }

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};
export default App;