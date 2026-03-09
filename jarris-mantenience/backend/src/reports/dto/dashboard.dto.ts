export class DashboardQueryDto {
  fechaDesde: string; // YYYY-MM-DD
  fechaHasta: string; // YYYY-MM-DD
  ubicacionId?: string; // opcional
}

export class ExcelQueryDto {
  fechaDesde: string; // YYYY-MM-DD
  fechaHasta: string; // YYYY-MM-DD
}
