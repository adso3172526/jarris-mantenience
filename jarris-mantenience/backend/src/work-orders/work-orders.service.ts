import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';

import { WorkOrderEntity, WorkOrderStatus, AssigneeType, MaintenanceType, WorkOrderPriority } from '../entities/work-order.entity';
import { AssetEntity } from '../entities/asset.entity';
import { LocationEntity } from '../entities/location.entity';
import { AssetEventEntity, AssetEventType } from '../entities/asset-event.entity';
import { LocativeCategoryEntity } from '../entities/locative-category.entity';

import { CreateWorkOrderDto } from './dto/create-work-order.dto';
import { AssignWorkOrderDto } from './dto/assign-work-order.dto';
import { FinishWorkOrderDto } from './dto/finish-work-order.dto';
import { CloseWorkOrderDto } from './dto/close-work-order.dto';
import { StartWorkOrderDto } from './dto/start-work-order.dto';
import { RejectWorkOrderDto } from './dto/reject-work-order.dto';
import { EditClosedWorkOrderDto } from './dto/edit-closed-work-order.dto';
import { UserEntity } from '../entities/user.entity';

import { MailService } from '../mail/mail.service';

@Injectable()
export class WorkOrdersService {
  constructor(
    @InjectRepository(WorkOrderEntity)
    private readonly woRepo: Repository<WorkOrderEntity>,

    @InjectRepository(AssetEntity)
    private readonly assetRepo: Repository<AssetEntity>,

    @InjectRepository(LocationEntity)
    private readonly locationRepo: Repository<LocationEntity>,

    @InjectRepository(AssetEventEntity)
    private readonly eventRepo: Repository<AssetEventEntity>,

    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,

    @InjectRepository(LocativeCategoryEntity)
    private readonly locativeCategoryRepo: Repository<LocativeCategoryEntity>,

    private readonly dataSource: DataSource,
    private readonly mail: MailService,
  ) {}

async create(dto: CreateWorkOrderDto) {
  // ? VALIDACIÓN 1: Si es EQUIPO, debe tener asset
  if (dto.maintenanceType === MaintenanceType.EQUIPO && !dto.assetId) {
    throw new BadRequestException(
      'Mantenimiento de EQUIPO requiere seleccionar un activo'
    );
  }

  // ? VALIDACIÓN 2: Si es LOCATIVO, NO debe tener asset
  if (dto.maintenanceType === MaintenanceType.LOCATIVO && dto.assetId) {
    throw new BadRequestException(
      'Mantenimiento LOCATIVO no debe tener activo asignado'
    );
  }

  // ? VALIDACIÓN 3: Si es LOCATIVO, debe tener categoría
  if (dto.maintenanceType === MaintenanceType.LOCATIVO && !dto.locativeCategoryId) {
    throw new BadRequestException(
      'Mantenimiento LOCATIVO requiere categoría'
    );
  }

  let asset: AssetEntity | undefined;
  let location: LocationEntity;

  // ? CASO 1: Mantenimiento de EQUIPO
  if (dto.maintenanceType === MaintenanceType.EQUIPO && dto.assetId) {
    asset = await this.assetRepo.findOne({
      where: { id: dto.assetId },
      relations: ['location'],
    }) ?? undefined;
    
    if (!asset) {
      throw new NotFoundException('Asset not found');
    }
    
    location = asset.location;
  }
  // ? CASO 2: Mantenimiento LOCATIVO (o EQUIPO sin asset desde el caso anterior)
  else {
    // Si viene locationId explícito (ADMIN/JEFE), usarlo directamente
    if (dto.locationId) {
      const foundLocation = await this.locationRepo.findOne({
        where: { id: dto.locationId },
      });
      if (!foundLocation) {
        throw new NotFoundException('Location not found');
      }
      location = foundLocation;
    } else {
      // Obtener ubicación del usuario PDV que crea la OT
      const user = await this.userRepo.findOne({
        where: { email: dto.createdBy },
      });

      if (!user?.locationId) {
        throw new BadRequestException(
          'Usuario PDV/ADMINISTRACION debe tener ubicación asignada para crear OT locativa'
        );
      }

      const foundLocation = await this.locationRepo.findOne({
        where: { id: user.locationId },
      });

      if (!foundLocation) {
        throw new NotFoundException('Location not found');
      }

      location = foundLocation;
    }
  }

  // Resolver categoría locativa si viene
  let locativeCategory: LocativeCategoryEntity | undefined;
  if (dto.locativeCategoryId) {
    const found = await this.locativeCategoryRepo.findOne({ where: { id: dto.locativeCategoryId } });
    if (!found) throw new NotFoundException('Locative category not found');
    locativeCategory = found;
  }

  // Crear OT
  const wo = this.woRepo.create({
    asset,  // Puede ser undefined para LOCATIVO
    location,
    maintenanceType: dto.maintenanceType || MaintenanceType.EQUIPO,
    locativeCategory,
    title: dto.title.trim(),
    requestDescription: dto.requestDescription,
    status: WorkOrderStatus.NUEVA,
    cost: 0,
    createdBy: dto.createdBy,
  });

  return this.woRepo.save(wo);
}

 async assign(id: string, dto: AssignWorkOrderDto) {
  const wo = await this.woRepo.findOne({
    where: { id },
    relations: ['asset', 'location', 'locativeCategory'],
  });
  if (!wo) throw new NotFoundException('Work order not found');
  if (![WorkOrderStatus.NUEVA, WorkOrderStatus.ASIGNADA].includes(wo.status)) {
    throw new BadRequestException('Only NUEVA or ASIGNADA can be reassigned');
  }
  wo.assigneeType = dto.assigneeType;
  wo.assigneeName = dto.assigneeName.trim();
  wo.assigneeEmail = dto.assigneeEmail?.trim();
  wo.assignmentDescription = dto.assignmentDescription?.trim() || undefined;
  wo.priority = dto.priority || undefined;
  wo.assignedAt = new Date();
  wo.status = WorkOrderStatus.ASIGNADA;
  const saved = await this.woRepo.save(wo);
  
  // Enviar correo si es CONTRATISTA o TECNICO_INTERNO
  if ([AssigneeType.CONTRATISTA, AssigneeType.INTERNO].includes(dto.assigneeType)) {
    if (!wo.assigneeEmail) {
      throw new BadRequestException('assigneeEmail is required');
    }
    
    // Solo buscar asset si es mantenimiento de equipo
    let asset: AssetEntity | null = null;
    if (wo.asset) {
      asset = await this.assetRepo.findOne({
        where: { id: wo.asset.id },
        relations: ['category', 'location'],
      });
    }
    
    // ⭐ NUEVO: Asunto mejorado
    const otShortId = saved.id.substring(0, 8);
    const subject = `Nueva OT Asignada - OT-${otShortId}`;
    
    // ⭐ NUEVO: Usar descripción del jefe (assignmentDescription) o fallback
    const workDescription = dto.assignmentDescription?.trim() || saved.requestDescription || '(sin descripción)';
    
    // Texto plano (fallback para clientes que no soportan HTML)
    const text = `
Nueva Orden de Trabajo Asignada

OT: ${saved.id}
${asset ? `Equipo: ${asset.code} - ${asset.description}
Categoría: ${asset.category?.name ?? ''}` : `Tipo: Locativo
Categoría: ${wo.locativeCategory?.name ?? ''}`}
Ubicación: ${wo.location?.name ?? ''}
${saved.priority ? `Prioridad: ${saved.priority}` : ''}
Descripción del Trabajo:
${workDescription}

Asignado a: ${saved.assigneeName}

Por favor atender la OT y registrar el trabajo realizado y el costo.
Cuando termine, suba la factura (PDF/JPG/PNG) si aplica.

— Sistema Jarris Mantenimiento
    `.trim();
    
    // ⭐ NUEVO: HTML profesional
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      margin: 0;
      padding: 0;
      background-color: #f5f5f5;
    }
    .wrapper {
      width: 100%;
      background-color: #f5f5f5;
      padding: 20px 0;
    }
    .wrapper-inner {
      max-width: 600px;
      margin: 0 auto;
      padding: 0 20px;
    }
    .container {
      background-color: #ffffff;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    .header {
      background: linear-gradient(135deg, #E60012 0%, #c00010 100%);
      color: white;
      padding: 30px 20px;
      text-align: center;
    }
    .header h1 {
      margin: 0;
      font-size: 24px;
      font-weight: 600;
    }
    .header .ot-number {
      font-size: 18px;
      margin-top: 10px;
      opacity: 0.95;
      font-weight: 500;
    }
    .content {
      padding: 30px 20px;
    }
    .section {
      margin-bottom: 25px;
    }
    .section-title {
      font-size: 14px;
      font-weight: 600;
      color: #666;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 10px;
      display: flex;
      align-items: center;
    }
    .section-title::before {
      content: '';
      display: inline-block;
      width: 4px;
      height: 16px;
      background-color: #E60012;
      margin-right: 8px;
      border-radius: 2px;
    }
    .info-grid {
      background-color: #f8f9fa;
      border-radius: 6px;
      padding: 15px;
    }
    .info-row {
      display: flex;
      padding: 8px 0;
      border-bottom: 1px solid #e9ecef;
    }
    .info-row:last-child {
      border-bottom: none;
    }
    .info-label {
      font-weight: 600;
      color: #495057;
      min-width: 120px;
      font-size: 14px;
    }
    .info-value {
      color: #212529;
      font-size: 14px;
    }
    .description-box {
      background-color: #d1ecf1;
      border-left: 4px solid #17a2b8;
      padding: 15px;
      border-radius: 4px;
      font-size: 15px;
      line-height: 1.6;
      color: #0c5460;
    }
    .assignee-box {
      background-color: #fff3cd;
      border-left: 4px solid #ffc107;
      padding: 15px;
      border-radius: 4px;
      font-size: 15px;
      font-weight: 500;
      color: #856404;
    }
    .instructions {
      background-color: #f8f9fa;
      border-radius: 6px;
      padding: 15px;
      font-size: 14px;
      color: #495057;
      line-height: 1.8;
    }
    .instructions ul {
      margin: 10px 0;
      padding-left: 20px;
    }
    .instructions li {
      margin: 5px 0;
    }
    .footer {
      background-color: #f8f9fa;
      padding: 20px;
      text-align: center;
      font-size: 12px;
      color: #6c757d;
      border-top: 1px solid #e9ecef;
    }
    .footer strong {
      color: #495057;
    }
    @media only screen and (max-width: 600px) {
      .wrapper-inner {
        padding: 0 10px;
      }
      .header {
        padding: 20px 15px;
      }
      .header h1 {
        font-size: 20px;
      }
      .content {
        padding: 20px 15px;
      }
      .info-row {
        flex-direction: column;
      }
      .info-label {
        margin-bottom: 5px;
      }
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td align="center">
          <div class="wrapper-inner">
  <div class="container">
    <!-- Header -->
    <div class="header" style="background: linear-gradient(135deg, #E60012 0%, #c00010 100%); color: white; padding: 30px 20px; text-align: center;">
      <h1 style="margin: 0; font-size: 24px; font-weight: 600; color: white;">🔔 Nueva OT Asignada</h1>
      <div class="ot-number" style="font-size: 18px; margin-top: 10px; opacity: 0.95; font-weight: 500; color: white;">OT-${otShortId}</div>
    </div>
    
    <!-- Content -->
    <div class="content">
      <!-- Detalles del Equipo/Trabajo -->
      <div class="section">
        <div class="section-title">Detalles de la Orden</div>
        <div class="info-grid">
          <div class="info-row">
            <div class="info-label">ID Completo:</div>
            <div class="info-value" style="font-family: monospace; font-size: 12px;">${saved.id}</div>
          </div>
          ${asset ? `
          <div class="info-row">
            <div class="info-label">Equipo:</div>
            <div class="info-value"><strong>${asset.code}</strong> - ${asset.description}</div>
          </div>
          <div class="info-row">
            <div class="info-label">Categoría:</div>
            <div class="info-value">${asset.category?.name ?? 'N/A'}</div>
          </div>
          ` : `
          <div class="info-row">
            <div class="info-label">Tipo:</div>
            <div class="info-value">Locativo</div>
          </div>
          <div class="info-row">
            <div class="info-label">Categoría:</div>
            <div class="info-value">${wo.locativeCategory?.name ?? 'N/A'}</div>
          </div>
          `}
          <div class="info-row">
            <div class="info-label">Ubicación:</div>
            <div class="info-value"><strong>${wo.location?.name ?? 'N/A'}</strong></div>
          </div>
          ${saved.priority ? `
          <div class="info-row">
            <div class="info-label">Prioridad:</div>
            <div class="info-value">
              <span style="display:inline-block;padding:2px 10px;border-radius:4px;font-weight:600;color:#fff;background-color:${saved.priority === WorkOrderPriority.ALTA ? '#f5222d' : saved.priority === WorkOrderPriority.MEDIA ? '#fa8c16' : '#52c41a'};">
                ${saved.priority}
              </span>
            </div>
          </div>
          ` : ''}
        </div>
      </div>
      
      <!-- Descripción del Trabajo -->
      <div class="section">
        <div class="section-title">Descripción del Trabajo</div>
        <div class="description-box">
          ${workDescription}
        </div>
      </div>
      
      <!-- Asignado a -->
      <div class="section">
        <div class="section-title">Asignado a</div>
        <div class="assignee-box">
          👤 ${saved.assigneeName}
        </div>
      </div>
      
      <!-- Instrucciones -->
      <div class="section">
        <div class="section-title">Instrucciones</div>
        <div class="instructions">
          Por favor proceder a:
          <ul>
            <li>Atender la orden de trabajo</li>
            <li>Registrar el trabajo realizado y el costo</li>
            <li>Subir la factura (PDF/JPG/PNG) cuando termine</li>
          </ul>
        </div>
      </div>
    </div>
    
    <!-- Footer -->
    <div class="footer">
      <strong>Jarris Mantenimiento</strong><br>
      Este es un correo automático, por favor no responder.
    </div>
  </div>
          </div>
        </td>
      </tr>
    </table>
  </div>
</body>
</html>
    `.trim();
    
    await this.mail.sendWorkOrderAssigned({
      to: wo.assigneeEmail,
      subject,
      text,
      html, // ⭐ NUEVO: Enviar HTML
    });
  }
  
  return saved;
}

  async start(id: string, dto: StartWorkOrderDto) {
    const wo = await this.woRepo.findOne({
      where: { id },
      relations: ['asset', 'location', 'locativeCategory'],
    });
    if (!wo) throw new NotFoundException('Work order not found');

    if (wo.status !== WorkOrderStatus.ASIGNADA) {
      throw new BadRequestException('Only ASIGNADA can be started');
    }

    wo.status = WorkOrderStatus.EN_PROCESO;
    wo.startedBy = dto.startedBy;
    wo.startedAt = new Date();
    return this.woRepo.save(wo);
  }

  async finish(id: string, dto: FinishWorkOrderDto) {
    const wo = await this.woRepo.findOne({
      where: { id },
      relations: ['asset', 'location', 'locativeCategory'],
    });
    if (!wo) throw new NotFoundException('Work order not found');

    if (wo.status !== WorkOrderStatus.EN_PROCESO) {
      throw new BadRequestException('La OT debe estar EN PROCESO para poder finalizarla. Primero debe iniciarla.');
    }

    wo.workDoneDescription = dto.workDoneDescription;
    wo.cost = dto.cost ?? 0;
    wo.finishedBy = dto.finishedBy;
    wo.finishedAt = new Date();
    wo.status = WorkOrderStatus.TERMINADA;

    return this.woRepo.save(wo);
  }

  async uploadInvoice(id: string, file: Express.Multer.File, uploadedBy: string) {
    if (!file) throw new BadRequestException('Invoice file is required');

    const wo = await this.woRepo.findOne({ where: { id }, relations: ['asset'] });
    if (!wo) throw new NotFoundException('Work order not found');

    // Permitir CONTRATISTA e INTERNO (técnicos internos)
    if (!wo.assigneeType) {
      throw new BadRequestException('Work order must be assigned before uploading invoice');
    }
    
    const allowedTypes = [AssigneeType.CONTRATISTA, AssigneeType.INTERNO];
    if (!allowedTypes.includes(wo.assigneeType)) {
      throw new BadRequestException('Only CONTRATISTA or INTERNO can upload invoice');
    }

    // Solo cuando está terminada (antes de cerrar)
    if (wo.status !== WorkOrderStatus.TERMINADA) {
      throw new BadRequestException('Invoice can be uploaded only when status is TERMINADA');
    }

    // Formatos permitidos
    const allowed = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
    if (!allowed.includes(file.mimetype)) {
      throw new BadRequestException('Formato no permitido. Solo PDF, JPG/JPEG o PNG.');
    }

    const invoicesDir = join(process.cwd(), 'uploads', 'invoices');
    if (!existsSync(invoicesDir)) mkdirSync(invoicesDir, { recursive: true });

    const safeOriginal = (file.originalname || 'invoice').replace(/[^\w.\-]+/g, '_');
    const finalName = `OT_${wo.id}_${Date.now()}_${safeOriginal}`;
    const finalPath = join(invoicesDir, finalName);

    if (!file.buffer) throw new BadRequestException('No file buffer. Ensure memoryStorage is enabled.');
    writeFileSync(finalPath, file.buffer);

    wo.invoiceFileName = safeOriginal;
    wo.invoiceFilePath = `/uploads/invoices/${finalName}`;
    wo.invoiceUploadedAt = new Date();
    wo.invoiceUploadedBy = uploadedBy || wo.assigneeName || 'CONTRATISTA';

    return this.woRepo.save(wo);
  }

  // NUEVO: Subir fotos
  async uploadPhotos(id: string, files: Express.Multer.File[], uploadedBy: string, userRole: string) {
    console.log('=== uploadPhotos called ===');
    console.log('OT ID:', id);
    console.log('Files received:', files?.length || 0);
    console.log('UploadedBy:', uploadedBy);
    console.log('UserRole:', userRole);
    console.log('UserRole type:', typeof userRole);

    if (!files || files.length === 0) {
      throw new BadRequestException('At least one photo is required');
    }

    if (files.length > 2) {
      throw new BadRequestException('Maximum 2 photos per upload');
    }

    if (!userRole) {
      throw new BadRequestException('userRole is required');
    }

    const wo = await this.woRepo.findOne({ where: { id }, relations: ['asset'] });
    if (!wo) throw new NotFoundException('Work order not found');

    // Formatos permitidos
    const allowed = ['image/jpeg', 'image/jpg', 'image/png'];
    for (const file of files) {
      if (!allowed.includes(file.mimetype)) {
        throw new BadRequestException('Solo imágenes JPG/JPEG o PNG permitidas');
      }
    }

    const photosDir = join(process.cwd(), 'uploads', 'work-order-photos');
    if (!existsSync(photosDir)) mkdirSync(photosDir, { recursive: true });

    const savedPaths: string[] = [];

    for (const file of files) {
      const safeOriginal = (file.originalname || 'photo').replace(/[^\w.\-]+/g, '_');
      const finalName = `OT_${wo.id}_${Date.now()}_${Math.random().toString(36).substring(7)}_${safeOriginal}`;
      const finalPath = join(photosDir, finalName);

      if (!file.buffer) throw new BadRequestException('No file buffer');
      writeFileSync(finalPath, file.buffer);

      savedPaths.push(`/uploads/work-order-photos/${finalName}`);
      console.log('Saved photo:', finalName);
    }

    // Determinar en qué campo guardar según rol
    const isPDV = userRole.toUpperCase().includes('PDV') || userRole.toUpperCase().includes('ADMINISTRACION');
    console.log('Is PDV?', isPDV);
    
    if (isPDV) {
      const existing = wo.pdvPhotos || [];
      wo.pdvPhotos = [...existing, ...savedPaths].slice(0, 2); // Máximo 2
      console.log('Saved to pdvPhotos:', wo.pdvPhotos);
    } else {
      const existing = wo.technicianPhotos || [];
      wo.technicianPhotos = [...existing, ...savedPaths].slice(0, 2); // Máximo 2
      console.log('Saved to technicianPhotos:', wo.technicianPhotos);
    }

    const result = await this.woRepo.save(wo);
    console.log('=== Photos saved successfully ===');
    return result;
  }

  // NUEVO: Rechazar OT (Jefe)
  async reject(id: string, dto: RejectWorkOrderDto) {
    const wo = await this.woRepo.findOne({
      where: { id },
      relations: ['asset', 'location', 'locativeCategory'],
    });
    if (!wo) throw new NotFoundException('Work order not found');

   if (![WorkOrderStatus.NUEVA, WorkOrderStatus.ASIGNADA].includes(wo.status)) {
  throw new BadRequestException('Only NUEVA or ASIGNADA can be reassigned');
}

    wo.rejectionReason = dto.rejectionReason;
    wo.rejectedBy = dto.rejectedBy;
    wo.rejectedAt = new Date();
    wo.status = WorkOrderStatus.RECHAZADA;

    const saved = await this.woRepo.save(wo);

    // Enviar email al PDV que creó la solicitud
    if (wo.createdBy) {
      const subject = `Solicitud rechazada: ${wo.id}`;
      const text = 
`Su solicitud de mantenimiento ha sido rechazada

OT: ${wo.id}
${wo.asset ? `Equipo: ${wo.asset.code} - ${wo.asset.description}` : `Tipo: Locativo - ${wo.locativeCategory?.name ?? ''}`}
Ubicación: ${wo.location.name}

Motivo del rechazo:
${dto.rejectionReason}

Rechazada por: ${dto.rejectedBy}
Fecha: ${new Date().toLocaleString('es-CO')}

— Sistema Jarris Mantenimiento`;

      await this.mail.sendWorkOrderAssigned({
        to: wo.createdBy,
        subject,
        text,
      });
    }

    return saved;
  }

  // Editar OT cerrada (ADMIN/JEFE)
  async editClosed(id: string, dto: EditClosedWorkOrderDto) {
    const wo = await this.woRepo.findOne({
      where: { id },
      relations: ['asset', 'location', 'locativeCategory'],
    });

    if (!wo) throw new NotFoundException('Work order not found');

    if (wo.status !== WorkOrderStatus.CERRADA) {
      throw new BadRequestException('Only CERRADA work orders can be edited');
    }

    if (dto.cost !== undefined) wo.cost = dto.cost;
    if (dto.workDoneDescription !== undefined) wo.workDoneDescription = dto.workDoneDescription;
    if (dto.requestDescription !== undefined) wo.requestDescription = dto.requestDescription;
    if (dto.title !== undefined) wo.title = dto.title;

    await this.woRepo.save(wo);

    // Actualizar el evento de activo asociado
    const eventRepo = this.dataSource.getRepository(AssetEventEntity);
    const event = await eventRepo.findOne({ where: { workOrderId: id } });
    if (event) {
      if (dto.workDoneDescription !== undefined) event.description = dto.workDoneDescription;
      if (dto.cost !== undefined) event.cost = dto.cost;
      await eventRepo.save(event);
    }

    return wo;
  }

 async close(id: string, dto: CloseWorkOrderDto) {
  return this.dataSource.transaction(async (manager) => {
    const wo = await manager.findOne(WorkOrderEntity, {
      where: { id },
      relations: ['asset', 'location', 'asset.location', 'locativeCategory'],
    });

    if (!wo) throw new NotFoundException('Work order not found');

    if (wo.status !== WorkOrderStatus.TERMINADA) {
      throw new BadRequestException('Only TERMINADA can be closed');
    }

    // ✅ SOLO crear evento en asset SI es mantenimiento de EQUIPO
    if (wo.maintenanceType === MaintenanceType.EQUIPO && wo.asset) {
      const allowedTypes = [AssetEventType.MANTENIMIENTO, AssetEventType.REPARACION];
      if (!allowedTypes.includes(dto.eventType)) {
        throw new BadRequestException('eventType must be MANTENIMIENTO or REPARACION');
      }

      const event = manager.create(AssetEventEntity, {
        asset: wo.asset,
        type: dto.eventType,
        fromLocation: wo.asset.location,
        toLocation: wo.asset.location,
        description: dto.eventDescription?.trim() || wo.workDoneDescription || `OT ${wo.id} cerrada`,
        cost: wo.cost ?? 0,
        workOrderId: wo.id,
        createdBy: dto.closedBy || undefined,
      });

      await manager.save(event);
    }

    // ✅ Para LOCATIVO, NO se crea evento en asset (no hay asset)
    // El costo queda registrado en la OT y se puede reportear por location

    wo.eventType = dto.eventType;
    wo.closedBy = dto.closedBy;
    wo.closedAt = new Date();
    wo.status = WorkOrderStatus.CERRADA;

    await manager.save(wo);

    return { ok: true, workOrder: wo };
  });
}

  findAll() {
    return this.woRepo.find({
      relations: ['asset', 'location', 'locativeCategory'],
      order: { createdAt: 'DESC' },
    });
  }
  async findByAsset(assetId: string) {
  return this.woRepo.find({
    where: {
      asset: { id: assetId },
      status: WorkOrderStatus.CERRADA,
    },
    relations: ['asset', 'asset.category', 'location', 'locativeCategory'],
    order: { closedAt: 'DESC' },
  });
}

  async findOne(id: string) {
    const wo = await this.woRepo.findOne({
      where: { id },
      relations: ['asset', 'location', 'locativeCategory'],
    });
    if (!wo) throw new NotFoundException('Work order not found');
    return wo;
  }

  async findByStatus(status: WorkOrderStatus) {
    return this.woRepo.find({
      where: { status },
      relations: ['asset', 'asset.category', 'asset.location', 'location', 'locativeCategory'],
      order: { createdAt: 'DESC' },
    });
  }

  async findByLocation(locationId: string) {
    return this.woRepo.find({
      where: { location: { id: locationId } },
      relations: ['asset', 'asset.category', 'location', 'locativeCategory'],
      order: { createdAt: 'DESC' },
    });
  }

  async findByAssignee(assigneeEmail: string) {
    return this.woRepo.find({
      where: { assigneeEmail },
      relations: ['asset', 'asset.category', 'location', 'locativeCategory'],
      order: { createdAt: 'DESC' },
    });
  }

  // NUEVO: Buscar OT por creador (para PDV)
  async findByCreator(creatorEmail: string) {
    return this.woRepo.find({
      where: { createdBy: creatorEmail },
      relations: ['asset', 'asset.category', 'location', 'locativeCategory'],
      order: { createdAt: 'DESC' },
    });
  }
    // ? NUEVO: Reemplazar factura en OT cerrada
  async replaceInvoice(id: string, file: Express.Multer.File, uploadedBy: string) {
    if (!file) throw new BadRequestException('Invoice file is required');

    const wo = await this.woRepo.findOne({ where: { id }, relations: ['asset'] });
    if (!wo) throw new NotFoundException('Work order not found');

    // Solo permitir en OT cerradas
    if (wo.status !== WorkOrderStatus.CERRADA) {
      throw new BadRequestException('Only CERRADA work orders can have invoice replaced');
    }

    // Validar formato
    const allowed = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
    if (!allowed.includes(file.mimetype)) {
      throw new BadRequestException('Formato no permitido. Solo PDF, JPG/JPEG o PNG.');
    }

    const invoicesDir = join(process.cwd(), 'uploads', 'invoices');
    if (!existsSync(invoicesDir)) mkdirSync(invoicesDir, { recursive: true });

    const safeOriginal = (file.originalname || 'invoice').replace(/[^\w.\-]+/g, '_');
    const finalName = `OT_${wo.id}_${Date.now()}_${safeOriginal}`;
    const finalPath = join(invoicesDir, finalName);

    if (!file.buffer) throw new BadRequestException('No file buffer');
    writeFileSync(finalPath, file.buffer);

    // Eliminar factura anterior si existe
    if (wo.invoiceFilePath) {
      const oldPath = join(process.cwd(), wo.invoiceFilePath.replace(/^\//, ''));
      if (existsSync(oldPath)) {
        try {
          require('fs').unlinkSync(oldPath);
        } catch (err) {
          console.error('Error deleting old invoice:', err);
        }
      }
    }

    wo.invoiceFileName = safeOriginal;
    wo.invoiceFilePath = `/uploads/invoices/${finalName}`;
    wo.invoiceUploadedAt = new Date();
    wo.invoiceUploadedBy = uploadedBy || 'ADMIN';

    return this.woRepo.save(wo);
  }

  // ? NUEVO: Reemplazar fotos en OT cerrada
  async replacePhotos(
    id: string,
    files: Express.Multer.File[],
    uploadedBy: string,
    photoType: 'pdv' | 'technician',
  ) {
    if (!files || files.length === 0) {
      throw new BadRequestException('At least one photo is required');
    }

    if (files.length > 2) {
      throw new BadRequestException('Maximum 2 photos');
    }

    const wo = await this.woRepo.findOne({ where: { id }, relations: ['asset'] });
    if (!wo) throw new NotFoundException('Work order not found');

    // Solo permitir en OT cerradas
    if (wo.status !== WorkOrderStatus.CERRADA) {
      throw new BadRequestException('Only CERRADA work orders can have photos replaced');
    }

    // Validar formatos
    const allowed = ['image/jpeg', 'image/jpg', 'image/png'];
    for (const file of files) {
      if (!allowed.includes(file.mimetype)) {
        throw new BadRequestException('Solo imágenes JPG/JPEG o PNG permitidas');
      }
    }

    const photosDir = join(process.cwd(), 'uploads', 'work-order-photos');
    if (!existsSync(photosDir)) mkdirSync(photosDir, { recursive: true });

    const savedPaths: string[] = [];

    for (const file of files) {
      const safeOriginal = (file.originalname || 'photo').replace(/[^\w.\-]+/g, '_');
      const finalName = `OT_${wo.id}_${Date.now()}_${Math.random().toString(36).substring(7)}_${safeOriginal}`;
      const finalPath = join(photosDir, finalName);

      if (!file.buffer) throw new BadRequestException('No file buffer');
      writeFileSync(finalPath, file.buffer);

      savedPaths.push(`/uploads/work-order-photos/${finalName}`);
    }

    // Eliminar fotos anteriores si existen
    const oldPhotos = photoType === 'pdv' ? wo.pdvPhotos : wo.technicianPhotos;
    if (oldPhotos && oldPhotos.length > 0) {
      for (const oldPhoto of oldPhotos) {
        const oldPath = join(process.cwd(), oldPhoto.replace(/^\//, ''));
        if (existsSync(oldPath)) {
          try {
            require('fs').unlinkSync(oldPath);
          } catch (err) {
            console.error('Error deleting old photo:', err);
          }
        }
      }
    }

    // Reemplazar fotos
    if (photoType === 'pdv') {
      wo.pdvPhotos = savedPaths;
    } else {
      wo.technicianPhotos = savedPaths;
    }

    return this.woRepo.save(wo);
  }

  async changeAsset(id: string, assetId: string) {
    const wo = await this.woRepo.findOne({
      where: { id },
      relations: ['asset', 'location', 'locativeCategory'],
    });
    if (!wo) throw new NotFoundException('Work order not found');

    const blockedStatuses = [WorkOrderStatus.CERRADA, WorkOrderStatus.RECHAZADA];
    if (blockedStatuses.includes(wo.status)) {
      throw new BadRequestException('No se puede cambiar el activo de una OT cerrada o rechazada');
    }

    const asset = await this.assetRepo.findOne({
      where: { id: assetId },
      relations: ['location'],
    });
    if (!asset) throw new NotFoundException('Activo no encontrado');

    wo.asset = asset;
    wo.location = asset.location;

    return this.woRepo.save(wo);
  }
}
