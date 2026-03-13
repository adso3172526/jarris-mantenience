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

const SIDEBAR_WIDTH = 90;

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
        key: '/eventos',
        icon: <UnorderedListOutlined />,
        label: 'Eventos',
        onClick: () => navigate('/eventos'),
      });
    }

    if (hasRole(['ADMIN', 'JEFE_MANTENIMIENTO', 'TECNICO_INTERNO'])) {
      items.push({
        key: '/assets',
        icon: <ToolOutlined />,
        label: 'Activos',
        onClick: () => navigate('/assets'),
      });
    }

    if (hasRole(['ADMIN', 'JEFE_MANTENIMIENTO', 'TECNICO_INTERNO'])) {
      items.push({
        key: '/events',
        icon: <SwapOutlined />,
        label: 'Traslados',
        onClick: () => navigate('/events'),
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
          label: 'Categorías',
          onClick: () => navigate('/categories'),
        },
        {
          key: '/locative-categories',
          icon: <TagOutlined />,
          label: 'Cat. Locat.',
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
          padding: '10px 4px',
          cursor: 'pointer',
          borderRadius: 8,
          margin: '2px 8px',
          background: isActive ? 'rgba(230, 0, 18, 0.15)' : 'transparent',
          color: isActive ? '#ff4d4f' : 'rgba(255,255,255,0.65)',
          transition: 'all 0.2s',
        }}
        onMouseEnter={(e) => {
          if (!isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
        }}
        onMouseLeave={(e) => {
          if (!isActive) e.currentTarget.style.background = 'transparent';
        }}
      >
        <span style={{ fontSize: 22, lineHeight: 1, marginBottom: 3 }}>
          {item.icon}
        </span>
        <span style={{
          fontSize: 10,
          lineHeight: 1.2,
          textAlign: 'center',
          fontWeight: isActive ? 600 : 400,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          maxWidth: '100%',
        }}>
          {item.label}
        </span>
      </div>
    );
  };

  // Mobile drawer menu items (full text, vertical list)
  const renderMobileMenuItem = (item: SidebarItem) => {
    const isActive = location.pathname === item.key;
    return (
      <div
        key={item.key}
        onClick={item.onClick}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '12px 20px',
          cursor: 'pointer',
          background: isActive ? '#fff1f0' : 'transparent',
          color: isActive ? '#E60012' : '#333',
          fontWeight: isActive ? 600 : 400,
          fontSize: 14,
          borderRight: isActive ? '3px solid #E60012' : '3px solid transparent',
        }}
      >
        <span style={{ fontSize: 18 }}>{item.icon}</span>
        <span>{item.label}</span>
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
            overflowY: 'auto',
            overflowX: 'hidden',
          }}
        >
          {/* Logo */}
          <div
            style={{
              height: 64,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontSize: 20,
              fontWeight: 800,
              letterSpacing: 2,
              fontFamily: "'Segoe UI', Arial, sans-serif",
              textTransform: 'uppercase',
              textShadow: '0 2px 4px rgba(0,0,0,0.3)',
              flexShrink: 0,
            }}
          >
            J´S
          </div>

          {/* Menu items */}
          <div style={{ flex: 1, paddingTop: 4 }}>
            {menuItems.map(renderSidebarItem)}
          </div>

          {/* Logout at bottom */}
          <div
            onClick={handleLogout}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '12px 4px',
              cursor: 'pointer',
              color: 'rgba(255,255,255,0.45)',
              borderTop: '1px solid rgba(255,255,255,0.1)',
              flexShrink: 0,
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = '#ff4d4f'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(255,255,255,0.45)'; }}
          >
            <LogoutOutlined style={{ fontSize: 20, marginBottom: 3 }} />
            <span style={{ fontSize: 10 }}>Salir</span>
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
            height: 64,
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 40,
              height: 40,
              background: '#E60012',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontWeight: 700,
              fontSize: 18,
            }}>
              J
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: 16 }}>JARRIS</div>
              <div style={{ fontSize: 12, color: '#8c8c8c' }}>Mantenimiento</div>
            </div>
          </div>
        }
        placement="left"
        onClose={() => setMobileMenuOpen(false)}
        open={mobileMenuOpen}
        width={280}
        styles={{ body: { padding: 0 } }}
      >
        {/* User Info */}
        <div style={{
          padding: '16px',
          background: '#f5f5f5',
          borderBottom: '1px solid #d9d9d9',
          marginBottom: 8,
        }}>
          <Space align="center">
            <Avatar style={{ backgroundColor: '#E60012' }} size={48}>
              {user?.email.charAt(0).toUpperCase()}
            </Avatar>
            <div>
              <div style={{ fontWeight: 500, fontSize: 14 }}>
                {user?.email.split('@')[0]}
              </div>
              <div style={{ fontSize: 12, color: '#8c8c8c' }}>
                {user?.roles && getRoleLabel(user.roles)}
              </div>
            </div>
          </Space>
        </div>

        {/* Menu Items */}
        <div>
          {menuItems.map(renderMobileMenuItem)}
        </div>

        {/* Logout at bottom */}
        <div style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          borderTop: '1px solid #d9d9d9',
          padding: '12px 16px',
        }}>
          <Button
            type="text"
            icon={<LogoutOutlined />}
            onClick={handleLogout}
            block
            style={{ textAlign: 'left' }}
          >
            Cerrar Sesión
          </Button>
        </div>
      </Drawer>
    </Layout>
  );
};

export default MainLayout;
