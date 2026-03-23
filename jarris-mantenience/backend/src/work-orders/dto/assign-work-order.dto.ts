import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, ValidateIf } from 'class-validator';
import { AssigneeType, WorkOrderPriority } from '../../entities/work-order.entity';

export class AssignWorkOrderDto {
  @IsEnum(AssigneeType)
  assigneeType: AssigneeType;

  @IsString()
  @IsNotEmpty()
  assigneeName: string;

  // ✅ Un solo campo (no duplicado)
  // - Obligatorio si CONTRATISTA
  // - Opcional si INTERNO
  @ValidateIf((o) => o.assigneeType === AssigneeType.CONTRATISTA)
  @IsNotEmpty()
  @IsEmail()
  @IsOptional() // permite que no venga cuando es INTERNO
  assigneeEmail?: string;

  // ⭐ Descripción/instrucciones del jefe al asignar (opcional)
  @IsString()
  @IsOptional()
  assignmentDescription?: string;

  @IsEnum(WorkOrderPriority)
  @IsOptional()
  priority?: WorkOrderPriority;
}

