import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { WorkOrderEntity } from '../entities/work-order.entity';
import { AssetEntity } from '../entities/asset.entity';
import { LocationEntity } from '../entities/location.entity';
import * as ExcelJS from 'exceljs';

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(WorkOrderEntity)
    private readonly woRepo: Repository<WorkOrderEntity>,
    @InjectRepository(AssetEntity)
    private readonly assetRepo: Repository<AssetEntity>,
    @InjectRepository(LocationEntity)
    private readonly locationRepo: Repository<LocationEntity>,
    private readonly dataSource: DataSource,
  ) {}

  private getBaseReportQuery(): string {
    return `
      SELECT
        'OT' AS tipo_registro,
        wo.id,
        wo.status::text AS estado,
        wo.maintenance_type::text AS categoria,
        COALESCE(wo.event_type::text, ev.type::text) AS tipo_mantenimiento,
        wo.locative_category::text AS categoria_locativa,
        wo.title AS solicitud,
        l.name AS ubicacion_nombre,
        l.id AS ubicacion_id,
        a.code AS activo_codigo,
        a.description AS activo_descripcion,
        c.name AS categoria_nombre,
        wo."requestDescription" AS descripcion_solicitud,
        wo."workDoneDescription" AS trabajo_realizado,
        wo."assigneeType"::text AS tipo_tecnico,
        wo."assigneeName" AS nombre_tecnico,
        wo."assigneeEmail" AS email_tecnico,
        wo.cost AS costo,
        wo."createdAt" AS fecha,
        wo."startedAt" AS fecha_inicio,
        wo."finishedAt" AS fecha_terminacion,
        wo."closedAt" AS fecha_cierre,
        CASE WHEN a.status::text = 'MANTENIMIENTO' THEN 1 ELSE 0 END AS activo_en_mantenimiento,
        0 AS es_evento_especial
      FROM work_orders wo
      LEFT JOIN locations l ON wo.location_id = l.id
      LEFT JOIN assets a ON wo.asset_id = a.id
      LEFT JOIN categories c ON a."categoryId" = c.id
      LEFT JOIN asset_events ev ON ev."workOrderId" = wo.id
      UNION ALL

      SELECT
        'EVENTO' AS tipo_registro,
        ae.id,
        CASE WHEN ae.active = true THEN 'REALIZADO' ELSE 'ANULADO' END AS estado,
        NULL::text AS categoria,
        ae.type::text AS tipo_mantenimiento,
        NULL::text AS categoria_locativa,
        ae.type::text AS solicitud,
        COALESCE(tl.name, fl.name, al.name) AS ubicacion_nombre,
        COALESCE(tl.id, fl.id, al.id) AS ubicacion_id,
        a.code AS activo_codigo,
        a.description AS activo_descripcion,
        c.name AS categoria_nombre,
        CASE
          WHEN ae.type::text = 'TRASLADO' THEN
            CONCAT('De: ', COALESCE(fl.name, 'N/A'), ' A: ', COALESCE(tl.name, 'N/A'))
          ELSE NULL
        END AS descripcion_solicitud,
        ae.description AS trabajo_realizado,
        CASE WHEN ae."createdBy" IS NOT NULL THEN 'USUARIO' ELSE NULL END AS tipo_tecnico,
        COALESCE(u.name, ae."createdBy") AS nombre_tecnico,
        ae."createdBy" AS email_tecnico,
        ae.cost AS costo,
        ae."createdAt" AS fecha,
        NULL::timestamptz AS fecha_inicio,
        NULL::timestamptz AS fecha_terminacion,
        NULL::timestamptz AS fecha_cierre,
        0 AS activo_en_mantenimiento,
        CASE WHEN ae.type::text IN ('BAJA', 'COMPRA') THEN 1 ELSE 0 END AS es_evento_especial
      FROM asset_events ae
      LEFT JOIN assets a ON ae.asset_id = a.id
      LEFT JOIN categories c ON a."categoryId" = c.id
      LEFT JOIN locations al ON a."locationId" = al.id
      LEFT JOIN locations fl ON ae.from_location_id = fl.id
      LEFT JOIN locations tl ON ae.to_location_id = tl.id
      LEFT JOIN users u ON u.email = ae."createdBy"
      WHERE ae."workOrderId" IS NULL
    `;
  }

  // Dashboard con filtros
  async getDashboardData(fechaDesde: string, fechaHasta: string, ubicacionId?: string) {
    let query = `
      SELECT
        tipo_registro,
        estado,
        categoria,
        ubicacion_id,
        ubicacion_nombre,
        costo,
        activo_en_mantenimiento,
        es_evento_especial,
        fecha,
        DATE_TRUNC('month', fecha) as mes,
        EXTRACT(YEAR FROM fecha) as año
      FROM (${this.getBaseReportQuery()}) AS reporte
      WHERE fecha >= $1 AND fecha < ($2::date + INTERVAL '1 day')
    `;

    const params: any[] = [fechaDesde, fechaHasta];

    if (ubicacionId) {
      query += ` AND ubicacion_id = $3`;
      params.push(ubicacionId);
    }

    const rawData = await this.dataSource.query(query, params);

    // Contar activos (no dados de baja)
    let assetsQuery = `SELECT COUNT(*) AS total FROM assets WHERE status != 'BAJA'`;
    const assetsParams: any[] = [];
    if (ubicacionId) {
      assetsQuery += ` AND "locationId" = $1`;
      assetsParams.push(ubicacionId);
    }
    const assetsResult = await this.dataSource.query(assetsQuery, assetsParams);
    const totalActivos = Number(assetsResult[0]?.total || 0);

    // Calcular métricas
    const totalRegistros = rawData.length;
    const totalOT = rawData.filter(x => x.tipo_registro === 'OT').length;
    const totalEventos = rawData.filter(x => x.tipo_registro === 'EVENTO').length;
    const totalGastado = rawData.filter(x => x.tipo_registro === 'OT' && x.estado === 'CERRADA').reduce((sum, x) => sum + Number(x.costo || 0), 0);
    const totalGastadoEventos = rawData.filter(x => x.tipo_registro === 'EVENTO').reduce((sum, x) => sum + Number(x.costo || 0), 0);
    const eventosEspeciales = rawData.filter(x => x.es_evento_especial === 1).length;

    // Métricas por tipo de OT
    const otEquipoCerradas = rawData.filter(x => x.tipo_registro === 'OT' && x.categoria === 'EQUIPO' && x.estado === 'CERRADA');
    const otLocativoCerradas = rawData.filter(x => x.tipo_registro === 'OT' && x.categoria === 'LOCATIVO' && x.estado === 'CERRADA');
    const cantidadOTEquipo = otEquipoCerradas.length;
    const valorOTEquipo = otEquipoCerradas.reduce((sum, x) => sum + Number(x.costo || 0), 0);
    const cantidadOTLocativo = otLocativoCerradas.length;
    const valorOTLocativo = otLocativoCerradas.reduce((sum, x) => sum + Number(x.costo || 0), 0);

    // Agrupar por ubicación
    const porUbicacion = {};
    rawData.forEach(row => {
      if (row.tipo_registro !== 'OT' || row.estado !== 'CERRADA') return;
      const key = row.ubicacion_nombre || 'Sin ubicación';
      if (!porUbicacion[key]) {
        porUbicacion[key] = { cantidadEquipo: 0, costoEquipo: 0, cantidadLocativo: 0, costoLocativo: 0 };
      }
      if (row.categoria === 'EQUIPO') {
        porUbicacion[key].cantidadEquipo++;
        porUbicacion[key].costoEquipo += Number(row.costo || 0);
      } else if (row.categoria === 'LOCATIVO') {
        porUbicacion[key].cantidadLocativo++;
        porUbicacion[key].costoLocativo += Number(row.costo || 0);
      }
    });

    // Agrupar por mes
    const porMes = {};
    rawData.forEach(row => {
      if (row.tipo_registro !== 'OT' || row.estado !== 'CERRADA') return;
      const mes = new Date(row.mes).toISOString();
      if (!porMes[mes]) {
        porMes[mes] = { cantidadEquipo: 0, costoEquipo: 0, cantidadLocativo: 0, costoLocativo: 0 };
      }
      if (row.categoria === 'EQUIPO') {
        porMes[mes].cantidadEquipo++;
        porMes[mes].costoEquipo += Number(row.costo || 0);
      } else if (row.categoria === 'LOCATIVO') {
        porMes[mes].cantidadLocativo++;
        porMes[mes].costoLocativo += Number(row.costo || 0);
      }
    });

    return {
      metricas: {
        totalRegistros,
        totalOT,
        totalEventos,
        totalGastado,
        totalGastadoEventos,
        totalActivos,
        eventosEspeciales,
        cantidadOTEquipo,
        valorOTEquipo,
        cantidadOTLocativo,
        valorOTLocativo,
      },
      porUbicacion: Object.entries(porUbicacion).map(([nombre, datos]: [string, any]) => ({
        ubicacion: nombre,
        cantidadEquipo: datos.cantidadEquipo,
        costoEquipo: datos.costoEquipo,
        cantidadLocativo: datos.cantidadLocativo,
        costoLocativo: datos.costoLocativo,
      })),
      porMes: Object.entries(porMes)
        .map(([mes, datos]: [string, any]) => ({
          mes,
          cantidadEquipo: datos.cantidadEquipo,
          costoEquipo: datos.costoEquipo,
          cantidadLocativo: datos.cantidadLocativo,
          costoLocativo: datos.costoLocativo,
        }))
        .sort((a, b) => new Date(a.mes).getTime() - new Date(b.mes).getTime()),
    };
  }

  // ✅ NUEVO: Generar Excel
  async generateExcel(fechaDesde: string, fechaHasta: string): Promise<Buffer> {
    try {
      const query = `
        SELECT * FROM (${this.getBaseReportQuery()}) AS reporte
        WHERE fecha >= $1 AND fecha < ($2::date + INTERVAL '1 day')
        ORDER BY fecha DESC
      `;

      const data = await this.dataSource.query(query, [fechaDesde, fechaHasta]);

      // Debug: ver columnas y primer registro
      if (data.length > 0) {
        console.log('=== DEBUG REPORTE ===');
        console.log('Columnas:', Object.keys(data[0]));
        console.log('Primer registro:', JSON.stringify(data[0], null, 2));
        // Buscar un evento para verificar
        const evento = data.find(r => r.tipo_registro === 'EVENTO');
        if (evento) {
          console.log('Primer EVENTO:', JSON.stringify(evento, null, 2));
        }
        // Buscar una OT con fecha_inicio
        const otConInicio = data.find(r => r.tipo_registro === 'OT' && r.fecha_inicio);
        if (otConInicio) {
          console.log('OT con fecha_inicio:', JSON.stringify(otConInicio, null, 2));
        }
      }

      // Crear workbook
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Reporte Completo');

    // Encabezado
    worksheet.columns = [
      { header: 'Registro', key: 'tipo_registro', width: 10 },
      { header: 'ID', key: 'id', width: 12 },
      { header: 'Estado', key: 'estado', width: 12 },
      { header: 'Categoría', key: 'categoria_ot', width: 14 },
      { header: 'Tipo', key: 'tipo_evento', width: 18 },
      { header: 'Ubicación', key: 'ubicacion_nombre', width: 20 },
      { header: 'Activo', key: 'activo', width: 30 },
      { header: 'Cat. Activo/Locativo', key: 'categoria_detalle', width: 20 },
      { header: 'Descripción', key: 'trabajo_realizado', width: 40 },
      { header: 'Responsable', key: 'nombre_responsable', width: 25 },
      { header: 'Email Responsable', key: 'email_responsable', width: 30 },
      { header: 'Costo', key: 'costo', width: 15 },
      { header: 'Fecha Ingreso', key: 'fecha', width: 18 },
      { header: 'Fecha Inicio', key: 'fecha_inicio', width: 18 },
      { header: 'Fecha Terminada', key: 'fecha_terminacion', width: 18 },
      { header: 'Fecha Cerrada', key: 'fecha_cierre', width: 18 },
    ];

    // Estilo del header
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE60012' },
    };
    worksheet.getRow(1).font = { color: { argb: 'FFFFFFFF' }, bold: true };

    // Agregar datos
    data.forEach((row) => {
      const esOT = row.tipo_registro === 'OT';

      worksheet.addRow({
        tipo_registro: row.tipo_registro,
        id: row.id ? row.id.substring(0, 8) : 'N/A',
        estado: row.estado || 'N/A',
        categoria_ot: esOT ? (row.categoria || 'N/A') : '',
        tipo_evento: esOT
          ? (row.tipo_mantenimiento || '-')
          : (row.tipo_mantenimiento || 'N/A'),
        ubicacion_nombre: row.ubicacion_nombre || 'N/A',
        activo: row.activo_codigo || (esOT ? 'LOCATIVO' : 'N/A'),
        categoria_detalle: row.categoria_nombre || row.categoria_locativa || 'N/A',
        trabajo_realizado: row.descripcion_solicitud
          ? row.descripcion_solicitud
          : (row.trabajo_realizado || 'N/A'),
        nombre_responsable: row.nombre_tecnico || 'N/A',
        email_responsable: row.email_tecnico || 'N/A',
        costo: Number(row.costo || 0),
        fecha: row.fecha ? new Date(row.fecha) : null,
        fecha_inicio: row.fecha_inicio ? new Date(row.fecha_inicio) : null,
        fecha_terminacion: row.fecha_terminacion ? new Date(row.fecha_terminacion) : null,
        fecha_cierre: row.fecha_cierre ? new Date(row.fecha_cierre) : null,
      });
    });

    // Formato de costo
    worksheet.getColumn('costo').numFmt = '"$"#,##0';

    // Formato de fechas
    ['fecha', 'fecha_inicio', 'fecha_terminacion', 'fecha_cierre'].forEach(col => {
      worksheet.getColumn(col).numFmt = 'dd/mm/yyyy hh:mm';
    });

    // Contar totales por tipo
    const totalOT = data.filter(r => r.tipo_registro === 'OT').length;
    const totalEventos = data.filter(r => r.tipo_registro === 'EVENTO').length;
    const costoTotal = data.reduce((sum, row) => sum + Number(row.costo || 0), 0);

    // Fila de totales
    const lastRow = worksheet.addRow({
      tipo_registro: '',
      id: '',
      estado: '',
      categoria_ot: '',
      tipo_evento: '',
      ubicacion_nombre: '',
      activo: '',
      categoria_detalle: '',
      trabajo_realizado: 'TOTALES:',
      nombre_responsable: `${totalOT} OT | ${totalEventos} Eventos`,
      email_responsable: '',
      costo: costoTotal,
    });

    lastRow.font = { bold: true };
    lastRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFF0F0F0' },
    };

    // Auto-filtros
    worksheet.autoFilter = {
      from: 'A1',
      to: 'P1',
    };

    // Generar buffer
    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
    } catch (error) {
      console.error('Error generando Excel:', error);
      throw new Error(`Error al generar Excel: ${error.message}`);
    }
  }

  // ✅ NUEVO: Generar Excel de Inventario de Activos
  async generateAssetsExcel(): Promise<Buffer> {
    try {
      const query = `
        SELECT
          a.id,
          a.code AS codigo,
          a.description AS descripcion,
          a.brand AS marca,
          a.model AS modelo,
          a.reference AS referencia,
          a.serial AS serial,
          a.value AS valor,
          a.status::text AS estado,
          c.name AS categoria,
          l.name AS ubicacion,
          l.type::text AS tipo_ubicacion,
          a."createdAt" AS fecha_registro
        FROM assets a
        LEFT JOIN categories c ON a."categoryId" = c.id
        LEFT JOIN locations l ON a."locationId" = l.id
        ORDER BY a.status, a.code
      `;
      const data = await this.dataSource.query(query);

      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Inventario de Activos');

      worksheet.columns = [
        { header: 'Código', key: 'codigo', width: 15 },
        { header: 'Descripción', key: 'descripcion', width: 35 },
        { header: 'Marca', key: 'marca', width: 15 },
        { header: 'Modelo', key: 'modelo', width: 15 },
        { header: 'Referencia', key: 'referencia', width: 15 },
        { header: 'Serial', key: 'serial', width: 20 },
        { header: 'Valor', key: 'valor', width: 15 },
        { header: 'Estado', key: 'estado', width: 15 },
        { header: 'Categoría', key: 'categoria', width: 20 },
        { header: 'Ubicación', key: 'ubicacion', width: 20 },
        { header: 'Tipo Ubicación', key: 'tipo_ubicacion', width: 15 },
        { header: 'Fecha Registro', key: 'fecha_registro', width: 18 },
      ];

      // Estilo del header
      worksheet.getRow(1).font = { color: { argb: 'FFFFFFFF' }, bold: true };
      worksheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE60012' },
      };

      // Agregar datos
      data.forEach((row) => {
        worksheet.addRow({
          codigo: row.codigo || 'N/A',
          descripcion: row.descripcion || 'N/A',
          marca: row.marca || 'N/A',
          modelo: row.modelo || 'N/A',
          referencia: row.referencia || 'N/A',
          serial: row.serial || 'N/A',
          valor: Number(row.valor || 0),
          estado: row.estado || 'N/A',
          categoria: row.categoria || 'N/A',
          ubicacion: row.ubicacion || 'N/A',
          tipo_ubicacion: row.tipo_ubicacion || 'N/A',
          fecha_registro: row.fecha_registro ? new Date(row.fecha_registro) : null,
        });
      });

      // Formato moneda y fecha
      worksheet.getColumn('valor').numFmt = '"$"#,##0';
      worksheet.getColumn('fecha_registro').numFmt = 'dd/mm/yyyy';

      // Auto-filtros
      worksheet.autoFilter = {
        from: 'A1',
        to: 'L1',
      };

      const buffer = await workbook.xlsx.writeBuffer();
      return Buffer.from(buffer);
    } catch (error) {
      console.error('Error generando Excel de activos:', error);
      throw new Error(`Error al generar Excel de activos: ${error.message}`);
    }
  }

  // ✅ MANTENER: Métodos existentes para retrocompatibilidad
  async getMaintenanceCostsByLocation() {
    // ... código existente
  }

  async getMaintenanceCostsByCategory() {
    // ... código existente
  }

  // ... otros métodos existentes
}
