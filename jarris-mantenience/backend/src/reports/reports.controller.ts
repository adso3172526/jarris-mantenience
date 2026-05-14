import { Controller, Get, Query, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Permissions } from '../common/decorators/permissions.decorator';
import { Permission } from '../common/enums/permission.enum';
import { ROLES } from '../users/roles';

@Controller('reports')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('dashboard')
  @Roles(ROLES.ADMIN, ROLES.JEFE_MANTENIMIENTO)
  @Permissions(Permission.VER_DASHBOARD)
  async getDashboard(
    @Query('fechaDesde') fechaDesde: string,
    @Query('fechaHasta') fechaHasta: string,
    @Query('ubicacionId') ubicacionId?: string,
  ) {
    return this.reportsService.getDashboardData(
      fechaDesde,
      fechaHasta,
      ubicacionId,
    );
  }

  @Get('excel/download')
  @Roles(ROLES.ADMIN, ROLES.JEFE_MANTENIMIENTO)
  @Permissions(Permission.GENERAR_REPORTES)
  async downloadExcel(
    @Query('fechaDesde') fechaDesde: string,
    @Query('fechaHasta') fechaHasta: string,
    @Res() res: Response,
  ) {
    const buffer = await this.reportsService.generateExcel(fechaDesde, fechaHasta);

    const filename = `Reporte_OT_${fechaDesde}_a_${fechaHasta}.xlsx`;

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', buffer.length);

    res.send(buffer);
  }

  @Get('excel/assets-download')
  @Roles(ROLES.ADMIN, ROLES.JEFE_MANTENIMIENTO)
  @Permissions(Permission.GENERAR_REPORTES)
  async downloadAssetsExcel(@Res() res: Response) {
    const buffer = await this.reportsService.generateAssetsExcel();

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="Reporte_Inventario_Activos.xlsx"',
    );
    res.setHeader('Content-Length', buffer.length);

    res.send(buffer);
  }

  @Get('maintenance-costs-by-location')
  @Roles(ROLES.ADMIN, ROLES.JEFE_MANTENIMIENTO)
  @Permissions(Permission.GENERAR_REPORTES)
  async getMaintenanceCostsByLocation() {
    return this.reportsService.getMaintenanceCostsByLocation();
  }

  @Get('maintenance-costs-by-category')
  @Roles(ROLES.ADMIN, ROLES.JEFE_MANTENIMIENTO)
  @Permissions(Permission.GENERAR_REPORTES)
  async getMaintenanceCostsByCategory() {
    return this.reportsService.getMaintenanceCostsByCategory();
  }
}
