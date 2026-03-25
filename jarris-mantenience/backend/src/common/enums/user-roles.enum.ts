export enum UserRole {
  ADMIN = 'ADMIN',
  JEFE_MANTENIMIENTO = 'JEFE_MANTENIMIENTO',
  TECNICO_INTERNO = 'TECNICO_INTERNO',
  CONTRATISTA = 'CONTRATISTA',
  PDV = 'PDV',
  ADMINISTRACION = 'ADMINISTRACION',
}

// Helper para validar roles
export const isValidRole = (role: string): role is UserRole => {
  return Object.values(UserRole).includes(role as UserRole);
};

// Array de todos los roles para validaciones
export const ALL_ROLES = Object.values(UserRole);
