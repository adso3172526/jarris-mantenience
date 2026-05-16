import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UploadedFile,
  UploadedFiles,
  UseInterceptors,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import * as multer from 'multer';
import { WorkOrdersService } from './work-orders.service';
import { CreateWorkOrderDto } from './dto/create-work-order.dto';
import { AssignWorkOrderDto } from './dto/assign-work-order.dto';
import { FinishWorkOrderDto } from './dto/finish-work-order.dto';
import { CloseWorkOrderDto } from './dto/close-work-order.dto';
import { StartWorkOrderDto } from './dto/start-work-order.dto';
import { RejectWorkOrderDto } from './dto/reject-work-order.dto';
import { EditClosedWorkOrderDto } from './dto/edit-closed-work-order.dto';
import { ChangeAssetDto } from './dto/change-asset.dto';
import { WorkOrderStatus } from '../entities/work-order.entity';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Permissions } from '../common/decorators/permissions.decorator';
import { Permission } from '../common/enums/permission.enum';

@Controller('work-orders')
@UseGuards(JwtAuthGuard, RolesGuard)
export class WorkOrdersController {
  constructor(private readonly service: WorkOrdersService) {}

  @Post()
  @Roles('ADMIN', 'JEFE_MANTENIMIENTO', 'TECNICO_INTERNO', 'PDV', 'ADMINISTRACION')
  @Permissions(Permission.CREAR_OT_EQUIPO, Permission.CREAR_OT_LOCATIVO)
  create(@Body() dto: CreateWorkOrderDto) {
    return this.service.create(dto);
  }

  @Get('by-asset/:assetId')
  @Roles('ADMIN', 'JEFE_MANTENIMIENTO', 'TECNICO_INTERNO', 'PDV', 'CONTRATISTA', 'ADMINISTRACION')
  @Permissions(Permission.VER_ACTIVOS, Permission.EDITAR_OT, Permission.CREAR_OT_EQUIPO)
  findByAsset(@Param('assetId') assetId: string) {
    return this.service.findByAsset(assetId);
  }

  @Get()
  @Roles('ADMIN', 'JEFE_MANTENIMIENTO', 'TECNICO_INTERNO')
  @Permissions(Permission.VER_ACTIVOS, Permission.EDITAR_OT, Permission.CREAR_OT_EQUIPO, Permission.CREAR_OT_LOCATIVO, Permission.CERRAR_OT, Permission.ANULAR_OT, Permission.VER_TODAS_OT, Permission.VER_TODAS_OT_LOCATIVO)
  findAll(@Req() req: any) {
    const profileLocationIds = req.user?.profileLocationIds || [];
    return this.service.findAll(profileLocationIds);
  }

  @Get('by-status/:status')
  @Roles('ADMIN', 'JEFE_MANTENIMIENTO')
  @Permissions(Permission.VER_DASHBOARD)
  findByStatus(@Param('status') status: WorkOrderStatus) {
    return this.service.findByStatus(status);
  }

  @Get('by-location/:locationId')
  @Roles('ADMIN', 'JEFE_MANTENIMIENTO', 'PDV', 'ADMINISTRACION')
  @Permissions(Permission.VER_ACTIVOS, Permission.EDITAR_OT, Permission.CREAR_OT_EQUIPO, Permission.CREAR_OT_LOCATIVO)
  findByLocation(@Param('locationId') locationId: string) {
    return this.service.findByLocation(locationId);
  }

  @Get('by-assignee')
  @Roles('ADMIN', 'JEFE_MANTENIMIENTO', 'TECNICO_INTERNO', 'CONTRATISTA')
  @Permissions(Permission.EDITAR_OT, Permission.VER_OT, Permission.INICIAR_OT, Permission.FINALIZAR_OT)
  findByAssignee(@Query('email') email: string) {
    return this.service.findByAssignee(email);
  }

  @Get('by-creator')
  @Roles('ADMIN', 'JEFE_MANTENIMIENTO', 'PDV', 'ADMINISTRACION')
  @Permissions(Permission.VER_ACTIVOS, Permission.EDITAR_OT, Permission.CREAR_OT_EQUIPO, Permission.CREAR_OT_LOCATIVO)
  findByCreator(@Query('email') email: string) {
    return this.service.findByCreator(email);
  }

  @Get(':id')
  @Roles('ADMIN', 'JEFE_MANTENIMIENTO', 'TECNICO_INTERNO', 'PDV', 'CONTRATISTA', 'ADMINISTRACION')
  @Permissions(Permission.VER_ACTIVOS, Permission.EDITAR_OT, Permission.CREAR_OT_EQUIPO, Permission.CREAR_OT_LOCATIVO)
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Patch(':id/assign')
  @Roles('ADMIN', 'JEFE_MANTENIMIENTO', 'TECNICO_INTERNO')
  @Permissions(Permission.ASIGNAR_TECNICO, Permission.REASIGNAR_TECNICO, Permission.EDITAR_OT)
  assign(@Param('id') id: string, @Body() dto: AssignWorkOrderDto) {
    return this.service.assign(id, dto);
  }

  @Patch(':id/start')
  @Roles('ADMIN', 'JEFE_MANTENIMIENTO', 'TECNICO_INTERNO', 'CONTRATISTA')
  @Permissions(Permission.EDITAR_OT, Permission.INICIAR_OT)
  start(@Param('id') id: string, @Body() dto: StartWorkOrderDto) {
    return this.service.start(id, dto);
  }

  @Patch(':id/finish')
  @Roles('ADMIN', 'JEFE_MANTENIMIENTO', 'TECNICO_INTERNO', 'CONTRATISTA')
  @Permissions(Permission.EDITAR_OT, Permission.FINALIZAR_OT)
  finish(@Param('id') id: string, @Body() dto: FinishWorkOrderDto) {
    return this.service.finish(id, dto);
  }

  @Patch(':id/close')
  @Roles('ADMIN', 'JEFE_MANTENIMIENTO')
  @Permissions(Permission.CERRAR_OT)
  close(@Param('id') id: string, @Body() dto: CloseWorkOrderDto) {
    return this.service.close(id, dto);
  }

  @Patch(':id/reject')
  @Roles('ADMIN', 'JEFE_MANTENIMIENTO')
  @Permissions(Permission.ANULAR_OT)
  reject(@Param('id') id: string, @Body() dto: RejectWorkOrderDto) {
    return this.service.reject(id, dto);
  }

  @Patch(':id/edit-closed')
  @Roles('ADMIN', 'JEFE_MANTENIMIENTO')
  @Permissions(Permission.EDITAR_OT)
  editClosed(@Param('id') id: string, @Body() dto: EditClosedWorkOrderDto) {
    return this.service.editClosed(id, dto);
  }

  @Patch(':id/change-asset')
  @Roles('ADMIN', 'JEFE_MANTENIMIENTO')
  @Permissions(Permission.CAMBIAR_ACTIVO_OT, Permission.EDITAR_OT)
  changeAsset(@Param('id') id: string, @Body() dto: ChangeAssetDto) {
    return this.service.changeAsset(id, dto.assetId);
  }

  @Patch(':id/change-location')
  @Roles('ADMIN', 'JEFE_MANTENIMIENTO')
  @Permissions(Permission.CAMBIAR_UBICACION_OT, Permission.EDITAR_OT)
  changeLocation(@Param('id') id: string, @Body() body: { locationId: string }) {
    return this.service.changeLocation(id, body.locationId);
  }

  @Post(':id/replace-invoice')
  @Roles('ADMIN', 'JEFE_MANTENIMIENTO')
  @Permissions(Permission.EDITAR_OT)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: multer.memoryStorage(),
      limits: { fileSize: 10 * 1024 * 1024 },
      fileFilter: (req, file, cb) => {
        const allowed = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
        if (!allowed.includes(file.mimetype)) {
          return cb(new Error('Formato no permitido'), false);
        }
        cb(null, true);
      },
    }),
  )
  replaceInvoice(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @Body('uploadedBy') uploadedBy: string,
  ) {
    return this.service.replaceInvoice(id, file, uploadedBy);
  }

  @Post(':id/replace-photos')
  @Roles('ADMIN', 'JEFE_MANTENIMIENTO')
  @Permissions(Permission.EDITAR_OT)
  @UseInterceptors(
    FilesInterceptor('files', 2, {
      storage: multer.memoryStorage(),
      limits: { fileSize: 15 * 1024 * 1024 },
      fileFilter: (req, file, cb) => {
        const allowed = ['image/jpeg', 'image/jpg', 'image/png'];
        if (!allowed.includes(file.mimetype)) {
          return cb(new Error('Solo imágenes JPG/PNG'), false);
        }
        cb(null, true);
      },
    }),
  )
  replacePhotos(
    @Param('id') id: string,
    @UploadedFiles() files: Express.Multer.File[],
    @Body('uploadedBy') uploadedBy: string,
    @Body('photoType') photoType: 'pdv' | 'technician',
  ) {
    if (!files || files.length === 0) {
      throw new BadRequestException('No se recibieron archivos');
    }
    return this.service.replacePhotos(id, files, uploadedBy, photoType);
  }

  @Post(':id/invoice')
  @Roles('ADMIN', 'JEFE_MANTENIMIENTO', 'TECNICO_INTERNO', 'CONTRATISTA')
  @Permissions(Permission.EDITAR_OT)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: multer.memoryStorage(),
      limits: { fileSize: 10 * 1024 * 1024 },
      fileFilter: (req, file, cb) => {
        const allowed = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
        if (!allowed.includes(file.mimetype)) {
          return cb(new Error('Formato no permitido'), false);
        }
        cb(null, true);
      },
    }),
  )
  uploadInvoice(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @Body('uploadedBy') uploadedBy: string,
  ) {
    return this.service.uploadInvoice(id, file, uploadedBy);
  }

  @Post(':id/photos')
  @Roles('ADMIN', 'JEFE_MANTENIMIENTO', 'TECNICO_INTERNO', 'CONTRATISTA', 'PDV', 'ADMINISTRACION')
  @Permissions(Permission.EDITAR_OT)
  @UseInterceptors(
    FilesInterceptor('files', 2, {
      storage: multer.memoryStorage(),
      limits: { fileSize: 15 * 1024 * 1024 },
      fileFilter: (req, file, cb) => {
        const allowed = ['image/jpeg', 'image/jpg', 'image/png'];
        if (!allowed.includes(file.mimetype)) {
          return cb(new Error('Solo imágenes JPG/PNG'), false);
        }
        cb(null, true);
      },
    }),
  )
  uploadPhotos(
    @Param('id') id: string,
    @UploadedFiles() files: Express.Multer.File[],
    @Body('uploadedBy') uploadedBy: string,
    @Body('userRole') userRole: string,
  ) {
    if (!files || files.length === 0) {
      throw new BadRequestException('No se recibieron archivos');
    }
    return this.service.uploadPhotos(id, files, uploadedBy, userRole);
  }
}
