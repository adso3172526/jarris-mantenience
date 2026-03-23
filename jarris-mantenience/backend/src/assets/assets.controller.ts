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
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { AssetsService } from './assets.service';
import { CreateAssetDto } from './dto/create-asset.dto';
import { UpdateAssetDto } from './dto/update-asset.dto';
import { TransferAssetDto } from './dto/transfer-asset.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('assets')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AssetsController {
  constructor(private readonly assetsService: AssetsService) {}

  @Post()
  @Roles('ADMIN', 'JEFE_MANTENIMIENTO', 'TECNICO_INTERNO')
  create(@Body() createAssetDto: CreateAssetDto) {
    return this.assetsService.create(createAssetDto);
  }

  @Get()
  @Roles('ADMIN', 'JEFE_MANTENIMIENTO', 'TECNICO_INTERNO', 'PDV', 'CONTRATISTA')
  findAll() {
    return this.assetsService.findAll();
  }

  @Get('location/:locationId')
  @Roles('ADMIN', 'JEFE_MANTENIMIENTO', 'TECNICO_INTERNO', 'PDV', 'CONTRATISTA')
  findByLocation(@Param('locationId') locationId: string) {
    return this.assetsService.findByLocation(locationId);
  }

  @Get('code/:code')
  @Roles('ADMIN', 'JEFE_MANTENIMIENTO', 'TECNICO_INTERNO', 'PDV', 'CONTRATISTA')
  findByCode(@Param('code') code: string) {
    return this.assetsService.findByCode(code);
  }

  @Get(':id')
  @Roles('ADMIN', 'JEFE_MANTENIMIENTO', 'TECNICO_INTERNO', 'PDV', 'CONTRATISTA')
  findOne(@Param('id') id: string) {
    return this.assetsService.findOne(id);
  }

  @Get(':id/qr')
  @Roles('ADMIN', 'JEFE_MANTENIMIENTO', 'TECNICO_INTERNO', 'PDV')
  async getQR(@Param('id') id: string) {
    const qrCode = await this.assetsService.getQRCode(id);
    return { qrCode };
  }

  // ✅ NUEVO: Obtener gastos por ubicación del activo
  @Get(':id/location-expenses')
  @Roles('ADMIN', 'JEFE_MANTENIMIENTO', 'TECNICO_INTERNO')
  async getLocationExpenses(@Param('id') id: string) {
    return this.assetsService.getLocationExpenses(id);
  }

  @Patch(':id')
  @Roles('ADMIN', 'JEFE_MANTENIMIENTO', 'TECNICO_INTERNO')
  update(@Param('id') id: string, @Body() updateAssetDto: UpdateAssetDto) {
    return this.assetsService.update(id, updateAssetDto);
  }

  @Patch(':id/deactivate')
  @Roles('ADMIN', 'JEFE_MANTENIMIENTO')
  deactivate(@Param('id') id: string, @Body() dto: { createdBy?: string; description?: string }) {
    return this.assetsService.deactivate(id, dto);
  }

  @Patch(':id/reactivate')
  @Roles('ADMIN', 'JEFE_MANTENIMIENTO')
  reactivate(@Param('id') id: string, @Body() dto: { createdBy?: string; description?: string }) {
    return this.assetsService.reactivate(id, dto);
  }

  @Post(':id/transfer')
  @Roles('ADMIN', 'JEFE_MANTENIMIENTO', 'TECNICO_INTERNO')
  transfer(@Param('id') id: string, @Body() transferDto: TransferAssetDto) {
    return this.assetsService.transfer(id, transferDto);
  }

  @Post(':id/photos')
  @Roles('ADMIN', 'JEFE_MANTENIMIENTO', 'TECNICO_INTERNO')
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
  async deletePhoto(
    @Param('id') id: string,
    @Param('photoIndex') photoIndex: string,
  ) {
    return await this.assetsService.removePhoto(id, parseInt(photoIndex));
  }
}
