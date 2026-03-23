import type { ThemeConfig } from 'antd';

export const theme: ThemeConfig = {
  token: {
    // Colores principales - Rojo JARRIS
    colorPrimary: '#E60012',
    colorSuccess: '#52c41a',
    colorWarning: '#faad14',
    colorError: '#cf1322',
    colorInfo: '#1677ff',
    
    // Tipografía
    fontSize: 14,
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    
    // Bordes redondeados
    borderRadius: 6,
    
    // Layout
    colorBgContainer: '#ffffff',
    colorBgLayout: '#f5f5f5',
    
    // Grises profesionales
    colorTextBase: '#262626',
    colorTextSecondary: '#595959',
    colorTextTertiary: '#8c8c8c',
    colorBorder: '#d9d9d9',
    colorBorderSecondary: '#f0f0f0',
  },
  components: {
    Layout: {
      headerBg: '#ffffff',
      headerHeight: 64,
      headerPadding: '0 24px',
      siderBg: '#E60012', // Sidebar en rojo JARRIS
      triggerBg: '#cc0010',
      triggerColor: '#ffffff',
    },
    Menu: {
      darkItemBg: '#E60012',
      darkItemColor: 'rgba(255, 255, 255, 0.85)',
      darkItemHoverBg: '#ff1a2e',
      darkItemSelectedBg: '#cc0010',
      darkItemSelectedColor: '#ffffff',
      darkSubMenuItemBg: '#cc0010',
    },
    Button: {
      primaryColor: '#ffffff',
      primaryShadow: '0 2px 0 rgba(230, 0, 18, 0.1)',
    },
    Table: {
      headerBg: '#fafafa',
      headerColor: '#262626',
      rowHoverBg: '#fff1f0',
    },
    Card: {
      headerBg: 'transparent',
    },
  },
};

// Estados de Work Orders con colores
export const workOrderStatusColors = {
  NUEVA: 'gold',
  ASIGNADA: 'blue',
  EN_PROCESO: 'cyan',
  TERMINADA: 'green',
  CERRADA: 'default',
  RECHAZADA: 'red',
} as const;

// Prioridades de Work Orders
export const workOrderPriorityColors = {
  BAJA: 'green',
  MEDIA: 'orange',
  ALTA: 'red',
} as const;

export const workOrderPriorityLabels = {
  BAJA: 'Baja',
  MEDIA: 'Media',
  ALTA: 'Alta',
} as const;

// Estados de Assets con colores
export const assetStatusColors = {
  ACTIVO: 'green-inverse',
  FUERA_SERVICIO: 'warning',
  BAJA: 'red-inverse',
} as const;
