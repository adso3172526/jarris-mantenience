import { IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID, ValidateIf } from 'class-validator';
import { MaintenanceType, LocativeCategory } from '../../entities/work-order.entity';

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
  @IsEnum(LocativeCategory)
  locativeCategory?: LocativeCategory;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsOptional()
  @IsString()
  requestDescription?: string;

  @IsOptional()
  @IsString()
  createdBy?: string; // Email del usuario que crea (PDV)
}
