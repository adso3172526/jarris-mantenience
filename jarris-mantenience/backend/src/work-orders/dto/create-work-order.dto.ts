import { IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID, ValidateIf } from 'class-validator';
import { MaintenanceType } from '../../entities/work-order.entity';

export class CreateWorkOrderDto {
  // ✅ CAMBIO: assetId ahora es opcional
  @IsOptional()
  @IsUUID()
  assetId?: string;

  // ✅ NUEVO: Tipo de mantenimiento (default: EQUIPO)
  @IsOptional()
  @IsEnum(MaintenanceType)
  maintenanceType?: MaintenanceType;

  // ✅ NUEVO: Categoría locativa (requerida solo si maintenanceType === LOCATIVO)
  @ValidateIf(o => o.maintenanceType === MaintenanceType.LOCATIVO)
  @IsString()
  @IsNotEmpty()
  locativeCategory?: string;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsOptional()
  @IsString()
  requestDescription?: string;

  @IsOptional()
  @IsString()
  createdBy?: string; // Email del usuario que crea (PDV)

  @IsOptional()
  @IsUUID()
  locationId?: string; // Ubicación destino (ADMIN/JEFE seleccionan manualmente)
}
