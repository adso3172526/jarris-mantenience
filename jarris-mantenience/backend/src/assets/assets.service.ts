import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import * as QRCode from 'qrcode';
import * as fs from 'fs';
import * as path from 'path';
import * as ExcelJS from 'exceljs';

import { AssetEntity, AssetStatus } from '../entities/asset.entity';
import { CategoryEntity } from '../entities/category.entity';
import { LocationEntity } from '../entities/location.entity';
import { AssetEventEntity, AssetEventType } from '../entities/asset-event.entity';
import { WorkOrderEntity, WorkOrderStatus, MaintenanceType } from '../entities/work-order.entity';

import { CreateAssetDto } from './dto/create-asset.dto';
import { UpdateAssetDto } from './dto/update-asset.dto';
import { TransferAssetDto } from './dto/transfer-asset.dto';

@Injectable()
export class AssetsService {
  constructor(
    @InjectRepository(AssetEntity)
    private readonly assetRepo: Repository<AssetEntity>,

    @InjectRepository(CategoryEntity)
    private readonly categoryRepo: Repository<CategoryEntity>,

    @InjectRepository(LocationEntity)
    private readonly locationRepo: Repository<LocationEntity>,

    @InjectRepository(AssetEventEntity)
    private readonly eventRepo: Repository<AssetEventEntity>,

    @InjectRepository(WorkOrderEntity)
    private readonly workOrderRepo: Repository<WorkOrderEntity>,

    private readonly dataSource: DataSource,
  ) {}

  async create(dto: CreateAssetDto) {
    const category = await this.categoryRepo.findOne({ where: { id: dto.categoryId } });
    if (!category) throw new NotFoundException('Category not found');

    const location = await this.locationRepo.findOne({ where: { id: dto.locationId } });
    if (!location) throw new NotFoundException('Location not found');

    return this.dataSource.transaction(async (manager) => {
      const seq = category.nextSequence;
      const code = `EQ-${category.codePrefix}-${String(seq).padStart(4, '0')}`;

      category.nextSequence += 1;
      await manager.save(category);

      const qrData = JSON.stringify({
        code,
        id: '',
        type: 'asset',
      });
      
      const qrCode = await QRCode.toDataURL(qrData, {
        errorCorrectionLevel: 'M',
        type: 'image/png',
        width: 300,
      });

      const asset = this.assetRepo.create({
        code,
        qrCode,
        description: dto.description,
        category,
        location,
        brand: dto.brand,
        reference: dto.reference,
        serial: dto.serial,
        value: dto.value ?? 0,
        status: dto.status ?? AssetStatus.ACTIVO,
      });

      const saved = await manager.save(AssetEntity, asset);

      const finalQrData = JSON.stringify({
        code: saved.code,
        id: saved.id,
        type: 'asset',
      });
      
      saved.qrCode = await QRCode.toDataURL(finalQrData, {
        errorCorrectionLevel: 'M',
        type: 'image/png',
        width: 300,
      });

      return manager.save(AssetEntity, saved);
    });
  }

  findAll() {
    return this.assetRepo.find({
      relations: ['category', 'location'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string) {
    const asset = await this.assetRepo.findOne({
      where: { id },
      relations: ['category', 'location'],
    });
    if (!asset) throw new NotFoundException('Asset not found');
    return asset;
  }

  async findByLocation(locationId: string) {
    return this.assetRepo.find({
      where: { location: { id: locationId } },
      relations: ['category', 'location'],
      order: { code: 'ASC' },
    });
  }

  async findByCode(code: string) {
    const asset = await this.assetRepo.findOne({
      where: { code },
      relations: ['category', 'location'],
    });
    if (!asset) throw new NotFoundException('Asset not found');
    return asset;
  }

  async update(id: string, dto: UpdateAssetDto) {
    const asset = await this.findOne(id);

    if (dto.description !== undefined) asset.description = dto.description;
    if (dto.brand !== undefined) asset.brand = dto.brand;
    if (dto.reference !== undefined) asset.reference = dto.reference;
    if (dto.serial !== undefined) asset.serial = dto.serial;
    if (dto.value !== undefined) asset.value = dto.value;
    if (dto.status !== undefined) asset.status = dto.status;

    let newCategory: CategoryEntity | null = null;
    if (dto.categoryId && dto.categoryId !== asset.category?.id) {
      newCategory = await this.categoryRepo.findOne({ where: { id: dto.categoryId } });
      if (!newCategory) throw new NotFoundException('Category not found');
    }

    if (dto.locationId && dto.locationId !== asset.location?.id) {
      const newLocation = await this.locationRepo.findOne({ where: { id: dto.locationId } });
      if (!newLocation) throw new NotFoundException('Location not found');
      asset.location = newLocation;
    }

    if (newCategory) {
      return this.dataSource.transaction(async (manager) => {
        const seq = newCategory.nextSequence;
        const newCode = `EQ-${newCategory.codePrefix}-${String(seq).padStart(4, '0')}`;

        newCategory.nextSequence += 1;
        await manager.save(newCategory);

        asset.code = newCode;
        asset.category = newCategory;

        const qrData = JSON.stringify({
          code: newCode,
          id: asset.id,
          type: 'asset',
        });

        asset.qrCode = await QRCode.toDataURL(qrData, {
          errorCorrectionLevel: 'M',
          type: 'image/png',
          width: 300,
        });

        return manager.save(asset);
      });
    }

    return this.assetRepo.save(asset);
  }

  async deactivate(id: string, dto: { createdBy?: string; description?: string }) {
    return await this.dataSource.transaction(async (manager) => {
      const asset = await manager.findOne(AssetEntity, {
        where: { id },
        relations: ['location', 'category'],
      });

      if (!asset) throw new NotFoundException(`Asset with ID ${id} not found`);
      if (asset.status === AssetStatus.BAJA) {
        throw new BadRequestException('El activo ya se encuentra dado de baja');
      }

      asset.status = AssetStatus.BAJA;
      await manager.save(AssetEntity, asset);

      const event = manager.create(AssetEventEntity, {
        asset,
        type: AssetEventType.BAJA,
        description: dto.description || 'Activo dado de baja',
        cost: 0,
        active: true,
        createdBy: dto.createdBy || undefined,
      });
      await manager.save(AssetEventEntity, event);

      return { ok: true, asset, event };
    });
  }

  async reactivate(id: string, dto: { createdBy?: string; description?: string }) {
    return await this.dataSource.transaction(async (manager) => {
      const asset = await manager.findOne(AssetEntity, {
        where: { id },
        relations: ['location', 'category'],
      });

      if (!asset) throw new NotFoundException(`Asset with ID ${id} not found`);
      if (asset.status !== AssetStatus.BAJA) {
        throw new BadRequestException('Solo se pueden reactivar activos en estado BAJA');
      }

      asset.status = AssetStatus.ACTIVO;
      await manager.save(AssetEntity, asset);

      const event = manager.create(AssetEventEntity, {
        asset,
        type: AssetEventType.REACTIVACION,
        description: dto.description || 'Activo reactivado',
        cost: 0,
        active: true,
        createdBy: dto.createdBy || undefined,
      });
      await manager.save(AssetEventEntity, event);

      return { ok: true, asset, event };
    });
  }

  async transfer(id: string, transferDto: TransferAssetDto): Promise<any> {
    return await this.dataSource.transaction(async (manager) => {
      const asset = await manager.findOne(AssetEntity, {
        where: { id },
        relations: ['location', 'category'],
      });

      if (!asset) {
        throw new NotFoundException(`Asset with ID ${id} not found`);
      }

      const fromLocation = asset.location;

      const toLocation = await manager.findOne(LocationEntity, {
        where: { id: transferDto.toLocationId },
      });

      if (!toLocation) {
        throw new NotFoundException(
          `Location with ID ${transferDto.toLocationId} not found`,
        );
      }

      asset.location = toLocation;
      await manager.save(AssetEntity, asset);

      const event = manager.create(AssetEventEntity, {
        asset,
        type: AssetEventType.TRASLADO,
        description: transferDto.description || `Transferido de ${fromLocation.name} a ${toLocation.name}`,
        fromLocation,
        toLocation,
        cost: transferDto.cost || 0,
        active: true,
        createdBy: transferDto.createdBy || undefined,
      });
      await manager.save(AssetEventEntity, event);

      return { ok: true, asset, event };
    });
  }

  async getQRCode(id: string): Promise<string> {
    const asset = await this.findOne(id);
    if (!asset.qrCode) {
      const qrData = JSON.stringify({
        code: asset.code,
        id: asset.id,
        type: 'asset',
      });
      
      asset.qrCode = await QRCode.toDataURL(qrData, {
        errorCorrectionLevel: 'M',
        type: 'image/png',
        width: 300,
      });

      await this.assetRepo.save(asset);
    }

    return asset.qrCode;
  }

  async addPhotos(assetId: string, files: Express.Multer.File[]) {
    const asset = await this.assetRepo.findOne({ where: { id: assetId } });
    if (!asset) {
      throw new NotFoundException('Activo no encontrado');
    }

    if (!files || files.length === 0) {
      throw new BadRequestException('No se enviaron archivos');
    }

    if (!asset.photos) {
      asset.photos = [];
    }

    if (asset.photos.length + files.length > 5) {
      throw new BadRequestException(
        `El activo puede tener máximo 5 fotos. Actualmente tiene ${asset.photos.length}.`
      );
    }

    const newPhotos = files.map(file => `/uploads/asset-photos/${file.filename}`);
    asset.photos = [...asset.photos, ...newPhotos];

    await this.assetRepo.save(asset);

    return {
      message: 'Fotos subidas exitosamente',
      photos: asset.photos,
      totalPhotos: asset.photos.length,
    };
  }

  async removePhoto(assetId: string, photoIndex: number) {
    const asset = await this.assetRepo.findOne({ where: { id: assetId } });
    if (!asset) {
      throw new NotFoundException('Activo no encontrado');
    }

    if (!asset.photos || asset.photos.length === 0) {
      throw new BadRequestException('Este activo no tiene fotos');
    }

    if (photoIndex < 0 || photoIndex >= asset.photos.length) {
      throw new BadRequestException('Índice de foto inválido');
    }

    const photoPath = asset.photos[photoIndex];
    const fullPath = path.join(process.cwd(), photoPath.replace('/uploads/', 'uploads/'));

    try {
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
      }
    } catch (error) {
      console.error('Error al eliminar archivo físico:', error);
    }

    asset.photos.splice(photoIndex, 1);
    await this.assetRepo.save(asset);

    return {
      message: 'Foto eliminada exitosamente',
      photos: asset.photos,
      totalPhotos: asset.photos.length,
    };
  }

  async getLocationExpenses(assetId: string) {
    const asset = await this.assetRepo.findOne({
      where: { id: assetId },
      relations: ['location'],
    });

    if (!asset) {
      throw new NotFoundException('Asset not found');
    }

    const workOrders = await this.workOrderRepo.find({
      where: {
        location: { id: asset.location.id },
        status: WorkOrderStatus.CERRADA,
        maintenanceType: MaintenanceType.LOCATIVO,
      },
      relations: ['location'],
      order: { closedAt: 'DESC' },
    });

    return workOrders;
  }

  // ---------------------------------------------------------------------------
  // Carga masiva de activos (plantilla Excel + importación)
  // ---------------------------------------------------------------------------

  private readonly IMPORT_COLUMNS: {
    key: string;
    header: string;
    width: number;
    required?: boolean;
  }[] = [
    { key: 'categoria', header: 'Categoria', width: 22, required: true },
    { key: 'ubicacion', header: 'Ubicacion', width: 22, required: true },
    { key: 'descripcion', header: 'Descripcion', width: 35, required: true },
    { key: 'marca', header: 'Marca', width: 16 },
    { key: 'modelo', header: 'Modelo', width: 16 },
    { key: 'referencia', header: 'Referencia', width: 16 },
    { key: 'serial', header: 'Serial', width: 20 },
    { key: 'valor', header: 'Valor', width: 14 },
    { key: 'estado', header: 'Estado', width: 14 },
  ];

  /** Descripción sentinela de la fila de ejemplo; se ignora al importar */
  private readonly EXAMPLE_MARKER = 'EJEMPLO - borre esta fila antes de importar';

  /** Normaliza texto: minúsculas, sin acentos, sin espacios extra ni '*' final */
  private normalizeText(value: unknown): string {
    return String(value ?? '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\*+$/, '')
      .trim()
      .toLowerCase();
  }

  /** Genera la plantilla .xlsx con listas de categorías/ubicaciones vigentes */
  async generateImportTemplate(): Promise<Buffer> {
    const [categories, locations] = await Promise.all([
      this.categoryRepo.find({ where: { active: true }, order: { name: 'ASC' } }),
      this.locationRepo.find({ where: { active: true }, order: { name: 'ASC' } }),
    ]);

    const workbook = new ExcelJS.Workbook();

    // --- Hoja de listas (fuente de los desplegables) ---
    const listas = workbook.addWorksheet('Listas');
    listas.getCell('A1').value = 'Categorias';
    listas.getCell('B1').value = 'Ubicaciones';
    listas.getCell('C1').value = 'Estados';
    listas.getRow(1).font = { bold: true };
    listas.getColumn('A').width = 30;
    listas.getColumn('B').width = 30;
    listas.getColumn('C').width = 18;
    categories.forEach((c, i) => (listas.getCell(`A${i + 2}`).value = c.name));
    locations.forEach((l, i) => (listas.getCell(`B${i + 2}`).value = l.name));
    ['ACTIVO', 'BAJA'].forEach(
      (s, i) => (listas.getCell(`C${i + 2}`).value = s),
    );

    // --- Hoja principal ---
    const sheet = workbook.addWorksheet('Activos');
    sheet.columns = this.IMPORT_COLUMNS.map((c) => ({
      header: c.required ? `${c.header} *` : c.header,
      key: c.key,
      width: c.width,
    }));
    sheet.getRow(1).font = { color: { argb: 'FFFFFFFF' }, bold: true };
    sheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE60012' },
    };

    // Fila de ejemplo
    sheet.addRow({
      categoria: categories[0]?.name ?? 'Freidoras',
      ubicacion: locations[0]?.name ?? 'PDV Ejemplo',
      descripcion: this.EXAMPLE_MARKER,
      marca: 'MarcaX',
      modelo: 'ModeloY',
      referencia: 'REF-123',
      serial: 'SN-000123',
      valor: 1500000,
      estado: 'ACTIVO',
    });
    sheet.getRow(2).font = { italic: true, color: { argb: 'FF999999' } };

    // Desplegables (rango 2..1000)
    const catRange = `Listas!$A$2:$A$${categories.length + 1}`;
    const locRange = `Listas!$B$2:$B$${locations.length + 1}`;
    const estRange = `Listas!$C$2:$C$3`;
    for (let r = 2; r <= 1000; r++) {
      if (categories.length > 0) {
        sheet.getCell(`A${r}`).dataValidation = {
          type: 'list',
          allowBlank: false,
          formulae: [catRange],
        };
      }
      if (locations.length > 0) {
        sheet.getCell(`B${r}`).dataValidation = {
          type: 'list',
          allowBlank: false,
          formulae: [locRange],
        };
      }
      sheet.getCell(`I${r}`).dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: [estRange],
      };
    }
    sheet.getColumn('valor').numFmt = '"$"#,##0';

    // --- Hoja de instrucciones ---
    const info = workbook.addWorksheet('Instrucciones');
    info.getColumn('A').width = 100;
    const lines = [
      'CARGA MASIVA DE ACTIVOS - INSTRUCCIONES',
      '',
      '1. Llene una fila por cada activo en la hoja "Activos".',
      '2. Borre la fila de ejemplo (fila 2, en gris) antes de importar.',
      '3. Columnas marcadas con * son obligatorias: Categoria, Ubicacion, Descripcion.',
      '4. Categoria y Ubicacion deben coincidir EXACTAMENTE con una de las listas',
      '   (use el desplegable de cada celda; las opciones salen de la hoja "Listas").',
      '5. Estado admite: ACTIVO o BAJA. Si lo deja vacío será ACTIVO.',
      '6. Valor debe ser un número (sin puntos ni símbolos). Si lo deja vacío será 0.',
      '7. El Código del activo (EQ-XX-0000) y el código QR se generan automáticamente;',
      '   NO los incluya en la plantilla.',
      '8. Si alguna fila tiene errores, NO se creará ningún activo: se le mostrará el',
      '   listado de filas a corregir para volver a subir el archivo.',
    ];
    lines.forEach((t, i) => {
      const cell = info.getCell(`A${i + 1}`);
      cell.value = t;
      if (i === 0) cell.font = { bold: true, size: 14, color: { argb: 'FFE60012' } };
    });

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  /** Parsea el .xlsx y crea activos (todo-o-nada). Devuelve reporte. */
  async importFromExcel(
    fileBuffer: Buffer,
  ): Promise<{ ok: boolean; total: number; created: number; errors: { row: number; message: string }[] }> {
    const workbook = new ExcelJS.Workbook();
    try {
      await workbook.xlsx.load(fileBuffer as any);
    } catch {
      throw new BadRequestException('El archivo no es un Excel (.xlsx) válido');
    }

    const sheet = workbook.getWorksheet('Activos') ?? workbook.worksheets[0];
    if (!sheet) throw new BadRequestException('El Excel no contiene la hoja "Activos"');

    // Mapear encabezados -> índice de columna
    const headerRow = sheet.getRow(1);
    const colIndex: Record<string, number> = {};
    headerRow.eachCell((cell, col) => {
      const norm = this.normalizeText(cell.value);
      const match = this.IMPORT_COLUMNS.find((c) => this.normalizeText(c.header) === norm);
      if (match) colIndex[match.key] = col;
    });
    for (const c of this.IMPORT_COLUMNS.filter((x) => x.required)) {
      if (!colIndex[c.key]) {
        throw new BadRequestException(
          `Falta la columna obligatoria "${c.header}" en el encabezado`,
        );
      }
    }

    // Mapas de resolución por nombre normalizado
    const [categories, locations] = await Promise.all([
      this.categoryRepo.find(),
      this.locationRepo.find(),
    ]);
    const catByName = new Map(categories.map((c) => [this.normalizeText(c.name), c]));
    const locByName = new Map(locations.map((l) => [this.normalizeText(l.name), l]));
    // Solo ACTIVO/BAJA en carga masiva (MANTENIMIENTO es estado interno, no importable)
    const validStatuses = new Set<string>([AssetStatus.ACTIVO, AssetStatus.BAJA]);

    const cellText = (row: ExcelJS.Row, key: string): string => {
      const idx = colIndex[key];
      if (!idx) return '';
      const v = row.getCell(idx).value as any;
      if (v == null) return '';
      if (typeof v === 'object') {
        // Texto enriquecido (richText)
        if (Array.isArray(v.richText)) {
          return v.richText.map((t: any) => t?.text ?? '').join('').trim();
        }
        // Hipervínculo { text, hyperlink }
        if ('text' in v) return String(v.text).trim();
        // Resultado de fórmula (solo si es primitivo, no error)
        if ('result' in v) {
          return v.result != null && typeof v.result !== 'object'
            ? String(v.result).trim()
            : '';
        }
        // Objeto desconocido -> vacío (evita "[object Object]")
        return '';
      }
      return String(v).trim();
    };

    // Lee el valor numérico de la columna Valor sin corromper decimales
    const parseValor = (row: ExcelJS.Row): { value: number; error?: string } => {
      const idx = colIndex['valor'];
      if (!idx) return { value: 0 };
      const raw = row.getCell(idx).value as any;
      if (raw == null || raw === '') return { value: 0 };

      let num: number;
      if (typeof raw === 'number') {
        num = raw;
      } else if (typeof raw === 'object' && typeof raw.result === 'number') {
        num = raw.result;
      } else {
        // Texto: formato colombiano -> puntos = miles, coma = decimal
        const s =
          typeof raw === 'object' && 'text' in raw ? String(raw.text) : String(raw);
        const cleaned = s.replace(/[$\s.]/g, '').replace(',', '.');
        if (!cleaned) return { value: 0 };
        num = Number(cleaned);
      }

      if (isNaN(num)) return { value: 0, error: `Valor "${String(raw)}" no es un número` };
      if (num < 0) return { value: 0, error: 'Valor no puede ser negativo' };
      if (num > 99999999.99)
        return { value: 0, error: 'Valor excede el máximo permitido (99.999.999,99)' };
      return { value: Math.round(num * 100) / 100 };
    };

    const errors: { row: number; message: string }[] = [];
    const parsed: {
      row: number;
      categoryId: string;
      locationId: string;
      description: string;
      brand?: string;
      model?: string;
      reference?: string;
      serial?: string;
      value: number;
      status: AssetStatus;
    }[] = [];

    for (let r = 2; r <= sheet.rowCount; r++) {
      const row = sheet.getRow(r);
      const categoria = cellText(row, 'categoria');
      const ubicacion = cellText(row, 'ubicacion');
      const descripcion = cellText(row, 'descripcion');
      const marca = cellText(row, 'marca');
      const modelo = cellText(row, 'modelo');
      const referencia = cellText(row, 'referencia');
      const serial = cellText(row, 'serial');
      const valorRaw = cellText(row, 'valor');
      const estadoRaw = cellText(row, 'estado');

      // Fila totalmente vacía -> ignorar
      if (![categoria, ubicacion, descripcion, marca, modelo, referencia, serial, valorRaw, estadoRaw].some((v) => v)) {
        continue;
      }

      // Fila de ejemplo de la plantilla -> ignorar (aunque no la borren)
      if (this.normalizeText(descripcion) === this.normalizeText(this.EXAMPLE_MARKER)) {
        continue;
      }

      const rowErrors: string[] = [];

      if (!descripcion) rowErrors.push('Descripcion es obligatoria');

      const category = categoria ? catByName.get(this.normalizeText(categoria)) : undefined;
      if (!categoria) rowErrors.push('Categoria es obligatoria');
      else if (!category) rowErrors.push(`Categoria "${categoria}" no existe`);

      const location = ubicacion ? locByName.get(this.normalizeText(ubicacion)) : undefined;
      if (!ubicacion) rowErrors.push('Ubicacion es obligatoria');
      else if (!location) rowErrors.push(`Ubicacion "${ubicacion}" no existe`);

      const valorParsed = parseValor(row);
      if (valorParsed.error) rowErrors.push(valorParsed.error);
      const value = valorParsed.value;

      let status = AssetStatus.ACTIVO;
      if (estadoRaw) {
        const upper = estadoRaw.toUpperCase();
        if (!validStatuses.has(upper)) {
          rowErrors.push(`Estado "${estadoRaw}" inválido (solo ACTIVO o BAJA)`);
        } else {
          status = upper as AssetStatus;
        }
      }

      if (rowErrors.length > 0) {
        errors.push({ row: r, message: rowErrors.join('; ') });
      } else {
        parsed.push({
          row: r,
          categoryId: category!.id,
          locationId: location!.id,
          description: descripcion,
          brand: marca || undefined,
          model: modelo || undefined,
          reference: referencia || undefined,
          serial: serial || undefined,
          value,
          status,
        });
      }
    }

    const total = parsed.length + errors.length;

    if (total === 0) {
      throw new BadRequestException('El archivo no contiene filas de activos para importar');
    }

    // Todo o nada
    if (errors.length > 0) {
      return { ok: false, total, created: 0, errors };
    }

    let created = 0;
    await this.dataSource.transaction(async (manager) => {
      // Cache dentro de la transacción para secuenciar nextSequence y evitar queries repetidas
      const catCache = new Map<string, CategoryEntity>();
      const locCache = new Map<string, LocationEntity>();

      for (const item of parsed) {
        let category = catCache.get(item.categoryId);
        if (!category) {
          // Lock pesimista: serializa importaciones concurrentes sobre la misma categoría
          const found = await manager.findOne(CategoryEntity, {
            where: { id: item.categoryId },
            lock: { mode: 'pessimistic_write' },
          });
          if (!found) throw new BadRequestException(`Fila ${item.row}: la categoría ya no existe`);
          category = found;
          catCache.set(item.categoryId, category);
        }
        let location = locCache.get(item.locationId);
        if (!location) {
          const foundLoc = await manager.findOne(LocationEntity, { where: { id: item.locationId } });
          if (!foundLoc) throw new BadRequestException(`Fila ${item.row}: la ubicación ya no existe`);
          location = foundLoc;
          locCache.set(item.locationId, location);
        }

        const seq = category.nextSequence;
        const code = `EQ-${category.codePrefix}-${String(seq).padStart(4, '0')}`;
        category.nextSequence += 1;
        await manager.save(CategoryEntity, category);

        const asset = this.assetRepo.create({
          code,
          description: item.description,
          category,
          location,
          brand: item.brand,
          model: item.model,
          reference: item.reference,
          serial: item.serial,
          value: item.value,
          status: item.status,
        });
        const saved = await manager.save(AssetEntity, asset);

        saved.qrCode = await QRCode.toDataURL(
          JSON.stringify({ code: saved.code, id: saved.id, type: 'asset' }),
          { errorCorrectionLevel: 'M', type: 'image/png', width: 300 },
        );
        await manager.save(AssetEntity, saved);
        created += 1;
      }
    });

    return { ok: true, total, created, errors: [] };
  }
}
