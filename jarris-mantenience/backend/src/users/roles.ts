export const ROLES = {
  ADMIN: 'ADMIN',
  JEFE_MANTENIMIENTO: 'JEFE_MANTENIMIENTO',
  TECNICO_INTERNO: 'TECNICO_INTERNO',
  CONTRATISTA: 'CONTRATISTA',
  PDV: 'PDV',
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];
