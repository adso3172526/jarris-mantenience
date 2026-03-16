import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class DashboardQueryDto {
  @IsString()
  @IsNotEmpty()
  fechaDesde: string; // YYYY-MM-DD

  @IsString()
  @IsNotEmpty()
  fechaHasta: string; // YYYY-MM-DD

  @IsOptional()
  @IsString()
  ubicacionId?: string; // opcional
}

export class ExcelQueryDto {
  @IsString()
  @IsNotEmpty()
  fechaDesde: string; // YYYY-MM-DD

  @IsString()
  @IsNotEmpty()
  fechaHasta: string; // YYYY-MM-DD
}