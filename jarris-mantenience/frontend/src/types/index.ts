export interface Asset {
  id: string;
  code: string;
  description?: string;
  // ... otros campos ...
  photos?: string[];  // ← AGREGAR ESTA LÍNEA
  createdAt: string;
  updatedAt: string;
}