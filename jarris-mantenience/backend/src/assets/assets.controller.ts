import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  Delete,
  UseGuards,
  UseInterceptors,
  UploadedFiles,
  UploadedFile,
  Res,
  BadRequestException,
} from '@nestjs/common';
import type { Response } from 'express';
import { FilesInterceptor, FileInterceptor } from '@nestjs/platform-express';
import { diskStorage, memoryStorage } from 'multer';
import { extname } from 'path';
import { AssetsService } from './assets.service';
import { CreateAssetDto } from './dto/create-asset.dto';
import { UpdateAssetDto } from './dto/update-asset.dto';
import { TransferAssetDto } from './dto/transfer-asset.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Permissions } from '../common/decorators/permissions.decorator';
import { Permission } from '../common/enums/permission.enum';

@Controller('assets')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AssetsController {
  constructor(private readonly assetsService: AssetsService) {}

  @Post()
  @Roles('ADMIN', 'JEFE_MANTENIMIENTO', 'TECNICO_INTERNO')
  @Permissions(Permission.EDITAR_ACTIVOS)
  create(@Body() createAssetDto: CreateAssetDto) {
    return this.assetsService.create(createAssetDto);
  }

  @Get()
  @Roles('ADMIN', 'JEFE_MANTENIMIENTO', 'TECNICO_INTERNO', 'PDV', 'CONTRATISTA', 'ADMINISTRACION')
  @Permissions(Permission.VER_ACTIVOS)
  findAll() {
    return this.assetsService.findAll();
  }

  @Get('import/template')
  @Roles('ADMIN', 'JEFE_MANTENIMIENTO')
  @Permissions(Permission.IMPORTAR_ACTIVOS)
  async downloadImportTemplate(@Res() res: Response) {
    const buffer = await this.assetsService.generateImportTemplate();
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="Plantilla_Carga_Activos.xlsx"',
    );
    res.setHeader('Content-Length', buffer.length);
    res.send(buffer);
  }

  @Post('import')
  @Roles('ADMIN', 'JEFE_MANTENIMIENTO')
  @Permissions(Permission.IMPORTAR_ACTIVOS)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 10 * 1024 * 1024 },
      fileFilter: (req, file, cb) => {
        if (!/\.(xlsx)$/i.test(file.originalname)) {
          return cb(new BadRequestException('Solo se permiten archivos .xlsx'), false);
        }
        cb(null, true);
      },
    }),
  )
  async importAssets(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('No se recibió ningún archivo');
    return this.assetsService.importFromExcel(file.buffer);
  }

  @Get('location/:locationId')
  @Roles('ADMIN', 'JEFE_MANTENIMIENTO', 'TECNICO_INTERNO', 'PDV', 'CONTRATISTA', 'ADMINISTRACION')
  @Permissions(Permission.VER_ACTIVOS)
  findByLocation(@Param('locationId') locationId: string) {
    return this.assetsService.findByLocation(locationId);
  }

  @Get('code/:code')
  @Roles('ADMIN', 'JEFE_MANTENIMIENTO', 'TECNICO_INTERNO', 'PDV', 'CONTRATISTA', 'ADMINISTRACION')
  @Permissions(Permission.VER_ACTIVOS)
  findByCode(@Param('code') code: string) {
    return this.assetsService.findByCode(code);
  }

  @Get(':id')
  @Roles('ADMIN', 'JEFE_MANTENIMIENTO', 'TECNICO_INTERNO', 'PDV', 'CONTRATISTA', 'ADMINISTRACION')
  @Permissions(Permission.VER_ACTIVOS)
  findOne(@Param('id') id: string) {
    return this.assetsService.findOne(id);
  }

  @Get(':id/qr')
  @Roles('ADMIN', 'JEFE_MANTENIMIENTO', 'TECNICO_INTERNO', 'PDV', 'ADMINISTRACION')
  @Permissions(Permission.VER_ACTIVOS)
  async getQR(@Param('id') id: string) {
    const qrCode = await this.assetsService.getQRCode(id);
    return { qrCode };
  }

  @Get(':id/location-expenses')
  @Roles('ADMIN', 'JEFE_MANTENIMIENTO', 'TECNICO_INTERNO')
  @Permissions(Permission.VER_ACTIVOS)
  async getLocationExpenses(@Param('id') id: string) {
    return this.assetsService.getLocationExpenses(id);
  }

  @Patch(':id')
  @Roles('ADMIN', 'JEFE_MANTENIMIENTO', 'TECNICO_INTERNO')
  @Permissions(Permission.EDITAR_ACTIVOS)
  update(@Param('id') id: string, @Body() updateAssetDto: UpdateAssetDto) {
    return this.assetsService.update(id, updateAssetDto);
  }

  @Patch(':id/deactivate')
  @Roles('ADMIN', 'JEFE_MANTENIMIENTO')
  @Permissions(Permission.VER_BAJAS, Permission.EDITAR_ACTIVOS)
  deactivate(@Param('id') id: string, @Body() dto: { createdBy?: string; description?: string }) {
    return this.assetsService.deactivate(id, dto);
  }

  @Patch(':id/reactivate')
  @Roles('ADMIN', 'JEFE_MANTENIMIENTO')
  @Permissions(Permission.VER_BAJAS, Permission.EDITAR_ACTIVOS)
  reactivate(@Param('id') id: string, @Body() dto: { createdBy?: string; description?: string }) {
    return this.assetsService.reactivate(id, dto);
  }

  @Post(':id/transfer')
  @Roles('ADMIN', 'JEFE_MANTENIMIENTO', 'TECNICO_INTERNO')
  @Permissions(Permission.CREAR_TRASLADOS)
  transfer(@Param('id') id: string, @Body() transferDto: TransferAssetDto) {
    return this.assetsService.transfer(id, transferDto);
  }

  @Post(':id/photos')
  @Roles('ADMIN', 'JEFE_MANTENIMIENTO', 'TECNICO_INTERNO')
  @Permissions(Permission.EDITAR_ACTIVOS)
  @UseInterceptors(
    FilesInterceptor('files', 5, {
      storage: diskStorage({
        destination: './uploads/asset-photos',
        filename: (req, file, cb) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = extname(file.originalname);
          cb(null, `asset-${req.params.id}-${uniqueSuffix}${ext}`);
        },
      }),
      fileFilter: (req, file, cb) => {
        if (!file.mimetype.match(/\/(jpg|jpeg|png|webp)$/)) {
          return cb(new Error('Solo imágenes permitidas'), false);
        }
        cb(null, true);
      },
      limits: {
        fileSize: 15 * 1024 * 1024,
      },
    }),
  )
  async uploadPhotos(
    @Param('id') id: string,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    return await this.assetsService.addPhotos(id, files);
  }

  @Delete(':id/photos/:photoIndex')
  @Roles('ADMIN', 'JEFE_MANTENIMIENTO', 'TECNICO_INTERNO')
  @Permissions(Permission.EDITAR_ACTIVOS)
  async deletePhoto(
    @Param('id') id: string,
    @Param('photoIndex') photoIndex: string,
  ) {
    return await this.assetsService.removePhoto(id, parseInt(photoIndex));
  }
}
