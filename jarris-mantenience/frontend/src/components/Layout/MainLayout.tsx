import React, { useState, useEffect } from 'react';
import { Layout, Avatar, Dropdown, Space, Drawer, Button } from 'antd';
import type { MenuProps } from 'antd';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  DashboardOutlined,
  ToolOutlined,
  FileTextOutlined,
  EnvironmentOutlined,
  AppstoreOutlined,
  BarChartOutlined,
  UserOutlined,
  LogoutOutlined,
  MenuOutlined,
  SwapOutlined,
  HomeOutlined,
  StopOutlined,
  UnorderedListOutlined,
  TagOutlined,
} from '@ant-design/icons';
import { useAuth } from '../../contexts/AuthContext';

const { Header, Content } = Layout;

const SIDEBAR_WIDTH = 100;

interface SidebarItem {
  key: string;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}

const MainLayout: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, hasRole } = useAuth();

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth <= 768;
      setIsMobile(mobile);
      if (!mobile) setMobileMenuOpen(false);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const userMenuItems: MenuProps['items'] = [
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: 'Cerrar Sesión',
      onClick: handleLogout,
    },
  ];

  const getMenuItems = (): SidebarItem[] => {
    const items: SidebarItem[] = [];

    if (hasRole(['ADMIN', 'JEFE_MANTENIMIENTO'])) {
      items.push({
        key: '/dashboard',
        icon: <DashboardOutlined />,
        label: 'Dashboard',
        onClick: () => navigate('/dashboard'),
      });
    }

    items.push({
      key: '/work-orders',
      icon: <FileTextOutlined />,
      label: 'Órdenes',
      onClick: () => navigate('/work-orders'),
    });

    if (hasRole(['ADMIN', 'JEFE_MANTENIMIENTO', 'TECNICO_INTERNO'])) {
      items.push({
        key: '/locative',
        icon: <HomeOutlined />,
        label: 'Locativo',
        onClick: () => navigate('/locative'),
      });
    }

    if (hasRole(['ADMIN', 'JEFE_MANTENIMIENTO', 'TECNICO_INTERNO'])) {
      items.push({
        key: '/events',
        icon: <UnorderedListOutlined />,
        label: 'Eventos',
        onClick: () => navigate('/events'),
      });
    }

    if (hasRole(['ADMIN', 'JEFE_MANTENIMIENTO', 'TECNICO_INTERNO', 'PDV', 'ADMINISTRACION'])) {
      items.push({
        key: '/assets',
        icon: <ToolOutlined />,
        label: 'Activos',
        onClick: () => navigate('/assets'),
      });
    }

    if (hasRole(['ADMIN', 'JEFE_MANTENIMIENTO', 'TECNICO_INTERNO'])) {
      items.push({
        key: '/traslados',
        icon: <SwapOutlined />,
        label: 'Traslados',
        onClick: () => navigate('/traslados'),
      });
    }

    if (hasRole(['ADMIN', 'JEFE_MANTENIMIENTO', 'TECNICO_INTERNO'])) {
      items.push({
        key: '/bajas',
        icon: <StopOutlined />,
        label: 'Bajas',
        onClick: () => navigate('/bajas'),
      });
    }

    if (hasRole(['ADMIN', 'JEFE_MANTENIMIENTO'])) {
      items.push(
        {
          key: '/locations',
          icon: <EnvironmentOutlined />,
          label: 'Ubicaciones',
          onClick: () => navigate('/locations'),
        },
        {
          key: '/categories',
          icon: <AppstoreOutlined />,
          label: 'Categorias Activos',
          onClick: () => navigate('/categories'),
        },
        {
          key: '/locative-categories',
          icon: <TagOutlined />,
          label: 'Categorias Locativos',
          onClick: () => navigate('/locative-categories'),
        },
        {
          key: '/users',
          icon: <UserOutlined />,
          label: 'Usuarios',
          onClick: () => navigate('/users'),
        },
        {
          key: '/reports',
          icon: <BarChartOutlined />,
          label: 'Reportes',
          onClick: () => navigate('/reports'),
        }
      );
    }

    return items;
  };

  const getRoleLabel = (roles: string[]) => {
    const roleLabels: Record<string, string> = {
      ADMIN: 'Admin',
      JEFE_MANTENIMIENTO: 'Jefe',
      TECNICO_INTERNO: 'Técnico',
      CONTRATISTA: 'Contratista',
      PDV: 'PDV',
      ADMINISTRACION: 'Administración',
    };
    return roles.map((r) => roleLabels[r] || r).join(', ');
  };

  const menuItems = getMenuItems();

  const renderSidebarItem = (item: SidebarItem) => {
    const isActive = location.pathname === item.key;
    return (
      <div
        key={item.key}
        onClick={item.onClick}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '10px 6px',
          cursor: 'pointer',
          borderRadius: 12,
          margin: '3px 8px',
          background: isActive ? '#E60012' : 'rgba(255,255,255,0.04)',
          color: isActive ? '#ffffff' : 'rgba(255,255,255,0.65)',
          transition: 'all 0.2s',
        }}
        onMouseEnter={(e) => {
          if (!isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.15)';
        }}
        onMouseLeave={(e) => {
          if (!isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
        }}
      >
        <span style={{ fontSize: 22, lineHeight: 1, marginBottom: 3 }}>
          {item.icon}
        </span>
        <span style={{
          fontSize: 11,
          lineHeight: 1.2,
          textAlign: 'center',
          fontWeight: isActive ? 600 : 400,
          wordBreak: 'break-word',
          maxWidth: '100%',
        }}>
          {item.label}
        </span>
      </div>
    );
  };

  // Mobile drawer menu items (botones con icono + texto)
  const renderMobileMenuItem = (item: SidebarItem) => {
    const isActive = location.pathname === item.key;
    return (
      <div
        key={item.key}
        onClick={item.onClick}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
          padding: '16px 8px',
          cursor: 'pointer',
          borderRadius: 12,
          background: isActive ? '#E60012' : 'rgba(255,255,255,0.05)',
          color: isActive ? '#fff' : 'rgba(255,255,255,0.75)',
          fontWeight: isActive ? 600 : 400,
          fontSize: 12,
          transition: 'all 0.2s',
          textAlign: 'center',
        }}
        onMouseEnter={(e) => {
          if (!isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
        }}
        onMouseLeave={(e) => {
          if (!isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
        }}
      >
        <span style={{ fontSize: 24, lineHeight: 1 }}>{item.icon}</span>
        <span style={{ lineHeight: 1.2, wordBreak: 'break-word', maxWidth: '100%' }}>{item.label}</span>
      </div>
    );
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      {/* Desktop Sidebar - always collapsed, icons + labels */}
      {!isMobile && (
        <div
          style={{
            width: SIDEBAR_WIDTH,
            minHeight: '100vh',
            background: '#1a2733',
            display: 'flex',
            flexDirection: 'column',
            position: 'fixed',
            top: 0,
            left: 0,
            bottom: 0,
            zIndex: 101,
            overflowY: 'hidden',
            overflowX: 'hidden',
          }}
        >
          {/* Logo */}
          <div
            style={{
              height: 24,
              flexShrink: 0,
            }}
          />

          {/* Menu items */}
          <div style={{ flex: 1, paddingTop: 16, display: 'flex', flexDirection: 'column', justifyContent: 'flex-start', paddingBottom: 80 }}>
            {menuItems.map(renderSidebarItem)}
          </div>

        </div>
      )}

      <Layout style={{ marginLeft: isMobile ? 0 : SIDEBAR_WIDTH }}>
        <Header
          style={{
            padding: isMobile ? '0 12px' : '0 24px',
            background: '#fff',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            position: 'sticky',
            top: 0,
            zIndex: 100,
            height: isMobile ? 48 : 64,
            lineHeight: isMobile ? '48px' : '64px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {isMobile && (
              <Button
                type="text"
                icon={<MenuOutlined style={{ fontSize: 20 }} />}
                onClick={() => setMobileMenuOpen(true)}
                style={{ padding: '4px 8px' }}
              />
            )}
            <div style={{
              fontSize: isMobile ? 16 : 18,
              fontWeight: isMobile ? 600 : 500,
              color: '#1a2733',
            }}>
              {isMobile ? 'JARRIS' : 'Mantenimiento'}
            </div>
          </div>

          <div style={{ paddingRight: isMobile ? 0 : 4 }}>
            <Dropdown menu={{ items: userMenuItems }} placement="bottomRight" trigger={['click']}>
              <Space
                align="center"
                style={{ cursor: 'pointer', lineHeight: 1 }}
              >
                <Avatar style={{ backgroundColor: '#E60012', width: isMobile ? 32 : 40, height: isMobile ? 32 : 40 }}>
                  {user?.email.charAt(0).toUpperCase()}
                </Avatar>

                {!isMobile && (
                  <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    <div style={{ fontSize: 14, fontWeight: 500, lineHeight: 1.2 }}>
                      {user?.email.split('@')[0]}
                    </div>
                    <div style={{ fontSize: 12, color: '#8c8c8c', lineHeight: 1.2 }}>
                      {user?.roles && getRoleLabel(user.roles)}
                    </div>
                  </div>
                )}
              </Space>
            </Dropdown>
          </div>
        </Header>

        <Content
          style={{
            margin: isMobile ? 0 : '24px',
            padding: isMobile ? 12 : 24,
            background: isMobile ? '#1a2733' : '#f0f2f5',
            minHeight: 280,
          }}
        >
          <Outlet />
        </Content>
      </Layout>

      {/* Mobile Menu Drawer */}
      <Drawer
        title={
          <span style={{ fontWeight: 700, fontSize: 16 }}>JARRIS</span>
        }
        placement="left"
        onClose={() => setMobileMenuOpen(false)}
        open={mobileMenuOpen}
        width={280}
        styles={{ body: { padding: 0, background: '#1a2733' }, header: { background: '#1a2733', borderBottom: '1px solid rgba(255,255,255,0.1)', color: '#fff' }, content: { background: '#1a2733' } }}
      >
        {/* User Info */}
        <div style={{
          padding: '16px',
          background: 'rgba(255,255,255,0.05)',
          borderBottom: '1px solid rgba(255,255,255,0.1)',
          marginBottom: 8,
        }}>
          <Space align="center">
            <Avatar style={{ backgroundColor: '#E60012' }} size={48}>
              {user?.email.charAt(0).toUpperCase()}
            </Avatar>
            <div>
              <div style={{ fontWeight: 500, fontSize: 14, color: '#fff' }}>
                {user?.email.split('@')[0]}
              </div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>
                {user?.roles && getRoleLabel(user.roles)}
              </div>
            </div>
          </Space>
        </div>

        {/* Menu Items */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, padding: '12px 16px' }}>
          {menuItems.map(renderMobileMenuItem)}
        </div>

        {/* Logout at bottom */}
        <div style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          borderTop: '1px solid rgba(255,255,255,0.1)',
          padding: '12px 16px',
        }}>
          <Button
            type="text"
            icon={<LogoutOutlined />}
            onClick={handleLogout}
            block
            style={{ textAlign: 'left', color: 'rgba(255,255,255,0.65)' }}
          >
            Cerrar Sesión
          </Button>
        </div>
      </Drawer>
    </Layout>
  );
};

export default MainLayout;
