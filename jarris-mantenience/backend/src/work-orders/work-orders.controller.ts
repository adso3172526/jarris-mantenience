import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
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
import { WorkOrderStatus } from '../entities/work-order.entity';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('work-orders')
@UseGuards(JwtAuthGuard, RolesGuard)
export class WorkOrdersController {
  constructor(private readonly service: WorkOrdersService) {}

  @Post()
  @Roles('ADMIN', 'JEFE_MANTENIMIENTO', 'TECNICO_INTERNO', 'PDV')
  create(@Body() dto: CreateWorkOrderDto) {
    return this.service.create(dto);
  }

  @Get('by-asset/:assetId')
  @Roles('ADMIN', 'JEFE_MANTENIMIENTO', 'TECNICO_INTERNO', 'PDV', 'CONTRATISTA')
  findByAsset(@Param('assetId') assetId: string) {
    return this.service.findByAsset(assetId);
  }

  @Get()
  @Roles('ADMIN', 'JEFE_MANTENIMIENTO', 'TECNICO_INTERNO')
  findAll() {
    return this.service.findAll();
  }

  @Get('by-status/:status')
  @Roles('ADMIN', 'JEFE_MANTENIMIENTO')
  findByStatus(@Param('status') status: WorkOrderStatus) {
    return this.service.findByStatus(status);
  }

  @Get('by-location/:locationId')
  @Roles('ADMIN', 'JEFE_MANTENIMIENTO', 'PDV')
  findByLocation(@Param('locationId') locationId: string) {
    return this.service.findByLocation(locationId);
  }

  @Get('by-assignee')
  @Roles('ADMIN', 'JEFE_MANTENIMIENTO', 'TECNICO_INTERNO', 'CONTRATISTA')
  findByAssignee(@Query('email') email: string) {
    return this.service.findByAssignee(email);
  }

  @Get('by-creator')
  @Roles('ADMIN', 'JEFE_MANTENIMIENTO', 'PDV')
  findByCreator(@Query('email') email: string) {
    return this.service.findByCreator(email);
  }

  @Get(':id')
  @Roles('ADMIN', 'JEFE_MANTENIMIENTO', 'TECNICO_INTERNO', 'PDV', 'CONTRATISTA')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Patch(':id/assign')
  @Roles('ADMIN', 'JEFE_MANTENIMIENTO', 'TECNICO_INTERNO')
  assign(@Param('id') id: string, @Body() dto: AssignWorkOrderDto) {
    return this.service.assign(id, dto);
  }

  @Patch(':id/start')
  @Roles('ADMIN', 'JEFE_MANTENIMIENTO', 'TECNICO_INTERNO', 'CONTRATISTA')
  start(@Param('id') id: string, @Body() dto: StartWorkOrderDto) {
    return this.service.start(id, dto);
  }

  @Patch(':id/finish')
  @Roles('ADMIN', 'JEFE_MANTENIMIENTO', 'TECNICO_INTERNO', 'CONTRATISTA')
  finish(@Param('id') id: string, @Body() dto: FinishWorkOrderDto) {
    return this.service.finish(id, dto);
  }

  @Patch(':id/close')
  @Roles('ADMIN', 'JEFE_MANTENIMIENTO')
  close(@Param('id') id: string, @Body() dto: CloseWorkOrderDto) {
    return this.service.close(id, dto);
  }

  @Patch(':id/reject')
  @Roles('ADMIN', 'JEFE_MANTENIMIENTO')
  reject(@Param('id') id: string, @Body() dto: RejectWorkOrderDto) {
    return this.service.reject(id, dto);
  }

  // Editar OT cerrada: SOLO ADMIN y JEFE
  @Patch(':id/edit-closed')
  @Roles('ADMIN', 'JEFE_MANTENIMIENTO')
  editClosed(@Param('id') id: string, @Body() dto: any) {
    return this.service.editClosed(id, dto);
  }

  // ✅ NUEVO: Reemplazar factura en OT cerrada
  @Post(':id/replace-invoice')
  @Roles('ADMIN', 'JEFE_MANTENIMIENTO')
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

  // ✅ NUEVO: Reemplazar fotos en OT cerrada
  @Post(':id/replace-photos')
  @Roles('ADMIN', 'JEFE_MANTENIMIENTO')
  @UseInterceptors(
    FilesInterceptor('files', 2, {
      storage: multer.memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024 },
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
  @Roles('ADMIN', 'JEFE_MANTENIMIENTO', 'TECNICO_INTERNO', 'CONTRATISTA', 'PDV')
  @UseInterceptors(
    FilesInterceptor('files', 2, {
      storage: multer.memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024 },
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
