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

// Estados de Work Orders con colores personalizados (fondo + texto)
export const workOrderStatusStyles: Record<string, { bg: string; color: string }> = {
  NUEVA: { bg: '#F3F4F6', color: '#374151' },
  ASIGNADA: { bg: '#DBEAFE', color: '#1E40AF' },
  EN_PROCESO: { bg: '#FEF3C7', color: '#92400E' },
  TERMINADA: { bg: '#D1FAE5', color: '#065F46' },
  CERRADA: { bg: '#F9FAFB', color: '#9CA3AF' },
  RECHAZADA: { bg: '#FEE2E2', color: '#991B1B' },
};

// Compat: mapa simple para casos que usen el preset de Ant Design
export const workOrderStatusColors = {
  NUEVA: 'default',
  ASIGNADA: 'blue',
  EN_PROCESO: 'gold',
  TERMINADA: 'green',
  CERRADA: 'default',
  RECHAZADA: 'red',
} as const;

// Prioridades de Work Orders con colores personalizados (fondo + texto)
export const workOrderPriorityStyles: Record<string, { bg: string; color: string }> = {
  BAJA: { bg: '#E0F2FE', color: '#0369A1' },
  MEDIA: { bg: '#FFEDD5', color: '#C2410C' },
  ALTA: { bg: '#FEE2E2', color: '#B91C1C' },
};

// Compat
export const workOrderPriorityColors = {
  BAJA: 'blue',
  MEDIA: 'orange',
  ALTA: 'red',
} as const;

export const workOrderPriorityLabels = {
  BAJA: 'Baja',
  MEDIA: 'Media',
  ALTA: 'Alta',
} as const;

// Tipos de evento (Mantenimiento / Reparación)
export const eventTypeStyles: Record<string, { bg: string; color: string }> = {
  MANTENIMIENTO: { bg: '#fcf7bb', color: '#D97706' },
  REPARACION: { bg: '#fae8d2', color: '#C2410C' },
  TRASLADO: { bg: '#FDF2F8', color: '#BE185D' },
  BAJA: { bg: '#F1F5F9', color: '#475569' },
  REACTIVACION: { bg: '#ECFDF5', color: '#059669' },
};

export const eventTypeLabels: Record<string, string> = {
  MANTENIMIENTO: 'Mantenimiento',
  REPARACION: 'Reparación',
  TRASLADO: 'Traslado',
  BAJA: 'Baja',
  REACTIVACION: 'Reactivación',
  COMPRA: 'Compra',
  TRANSFERENCIA: 'Transferencia',
};

// Estados de Assets con colores
export const assetStatusColors = {
  ACTIVO: 'green-inverse',
  FUERA_SERVICIO: 'warning',
  BAJA: 'red-inverse',
} as const;
