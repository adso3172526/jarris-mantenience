import React, { useState, useEffect } from 'react';
import { Layout, Menu, Avatar, Dropdown, Space, Drawer, Button } from 'antd';
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
} from '@ant-design/icons';
import { useAuth } from '../../contexts/AuthContext';

const { Header, Sider, Content } = Layout;

const MainLayout: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, hasRole } = useAuth();

  // Detect mobile on resize
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth <= 768;
      setIsMobile(mobile);
      if (!mobile) {
        setMobileMenuOpen(false); // Close mobile menu when resizing to desktop
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Close mobile menu when route changes
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

  // Filtrar items del menú según rol
  const getMenuItems = (): MenuProps['items'] => {
    const items: MenuProps['items'] = [];

    // 1. Dashboard: Solo ADMIN y JEFE_MANTENIMIENTO
    if (hasRole(['ADMIN', 'JEFE_MANTENIMIENTO'])) {
      items.push({
        key: '/dashboard',
        icon: <DashboardOutlined />,
        label: 'Dashboard',
        onClick: () => navigate('/dashboard'),
      });
    }

    // 2. Órdenes de Trabajo - Todos los roles
    items.push({
      key: '/work-orders',
      icon: <FileTextOutlined />,
      label: 'Órdenes de Trabajo',
      onClick: () => navigate('/work-orders'),
    });

    // 3. Locativo: ADMIN, JEFE_MANTENIMIENTO, TECNICO_INTERNO
    if (hasRole(['ADMIN', 'JEFE_MANTENIMIENTO', 'TECNICO_INTERNO'])) {
      items.push({
        key: '/locative',
        icon: <HomeOutlined />,
        label: 'Locativo',
        onClick: () => navigate('/locative'),
      });
    }

    // 3.5 Eventos: ADMIN, JEFE_MANTENIMIENTO, TECNICO_INTERNO
    if (hasRole(['ADMIN', 'JEFE_MANTENIMIENTO', 'TECNICO_INTERNO'])) {
      items.push({
        key: '/eventos',
        icon: <UnorderedListOutlined />,
        label: 'Eventos',
        onClick: () => navigate('/eventos'),
      });
    }

    // 4. Activos: Solo ADMIN, JEFE_MANTENIMIENTO y TECNICO_INTERNO
    if (hasRole(['ADMIN', 'JEFE_MANTENIMIENTO', 'TECNICO_INTERNO'])) {
      items.push({
        key: '/assets',
        icon: <ToolOutlined />,
        label: 'Activos',
        onClick: () => navigate('/assets'),
      });
    }

    // 5. Traslados: ADMIN, JEFE_MANTENIMIENTO, TECNICO_INTERNO
    if (hasRole(['ADMIN', 'JEFE_MANTENIMIENTO', 'TECNICO_INTERNO'])) {
      items.push({
        key: '/events',
        icon: <SwapOutlined />,
        label: 'Traslados',
        onClick: () => navigate('/events'),
      });
    }

    // 6. Historial Bajas: ADMIN, JEFE_MANTENIMIENTO, TECNICO_INTERNO
    if (hasRole(['ADMIN', 'JEFE_MANTENIMIENTO', 'TECNICO_INTERNO'])) {
      items.push({
        key: '/bajas',
        icon: <StopOutlined />,
        label: 'Historial Bajas',
        onClick: () => navigate('/bajas'),
      });
    }

    // Solo ADMIN y JEFE_MANTENIMIENTO ven estas opciones
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
          key: '/reports',
          icon: <BarChartOutlined />,
          label: 'Reportes',
          onClick: () => navigate('/reports'),
        }
      );
    }

    // ADMIN y JEFE_MANTENIMIENTO ven usuarios
    if (hasRole(['ADMIN', 'JEFE_MANTENIMIENTO'])) {
      items.push({
        key: '/users',
        icon: <UserOutlined />,
        label: 'Usuarios',
        onClick: () => navigate('/users'),
      });
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


  return (
    <Layout style={{ minHeight: '100vh' }}>
      {/* Desktop Sidebar */}
      {!isMobile && (
        <Sider
          collapsible
          collapsed={collapsed}
          onCollapse={setCollapsed}
          style={{
            background: '#2c3e50',
          }}
        >
          <div
            style={{
              height: 64,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontSize: collapsed ? 18 : 24,
              fontWeight: 800,
              letterSpacing: collapsed ? 0 : 4,
              fontFamily: "'Segoe UI', Arial, sans-serif",
              textTransform: 'uppercase',
              textShadow: '0 2px 4px rgba(0,0,0,0.3)',
              transition: 'all 0.2s',
            }}
          >
            {collapsed ? 'J' : 'JARRIS'}
          </div>

          <Menu
            mode="inline"
            selectedKeys={[location.pathname]}
            items={getMenuItems()}
            style={{
              background: '#2c3e50',
              border: 'none',
            }}
            theme="dark"
          />
        </Sider>
      )}

      <Layout>
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
          {/* Left side: Menu button (mobile) or Title */}
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
              color: '#2c3e50'
            }}>
              {isMobile ? 'JARRIS' : 'Mantenimiento'}
            </div>
          </div>

          {/* Right side: User dropdown */}
          <div style={{ paddingRight: isMobile ? 0 : 28 }}>
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
            margin: isMobile ? '12px' : '24px',
            padding: isMobile ? 12 : 24,
            background: '#f0f2f5',
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
              fontSize: 18
            }}>
              J
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: 16 }}>JARRIS</div>
              <div style={{ fontSize: 12, color: '#8c8c8c' }}>
                Mantenimiento
              </div>
            </div>
          </div>
        }
        placement="left"
        onClose={() => setMobileMenuOpen(false)}
        open={mobileMenuOpen}
        width={280}
        styles={{
          body: { padding: 0 }
        }}
      >
        {/* User Info in Drawer */}
        <div style={{ 
          padding: '16px',
          background: '#f5f5f5',
          borderBottom: '1px solid #d9d9d9',
          marginBottom: 8
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
        <Menu
          mode="inline"
          selectedKeys={[location.pathname]}
          items={getMenuItems()}
          style={{ border: 'none' }}
        />

        {/* Logout at bottom */}
        <div style={{ 
          position: 'absolute', 
          bottom: 0, 
          left: 0, 
          right: 0,
          borderTop: '1px solid #d9d9d9',
          padding: '12px 16px'
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