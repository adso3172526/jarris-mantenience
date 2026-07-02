import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { join } from 'path';

// Zona horaria Colombia
process.env.TZ = 'America/Bogota';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  
  // CORS - orígenes permitidos desde variable de entorno CORS_ORIGINS
  // (lista separada por comas). Si no está definida, usa los de desarrollo.
  const defaultOrigins = [
    'http://localhost:5173',
    'http://192.168.123.98:5173',
  ];
  const corsOrigins = (process.env.CORS_ORIGINS ?? '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  app.enableCors({
    origin: corsOrigins.length > 0 ? corsOrigins : defaultOrigins,
    credentials: true,
  });
  
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    transformOptions: {
      enableImplicitConversion: true,
    },
  }));
  
  app.useStaticAssets(join(process.cwd(), 'uploads'), {
    prefix: '/uploads/',
  });
  
  await app.listen(3000, '0.0.0.0'); // ⭐ Importante
  console.log('Application is running on: http://localhost:3000');
}
bootstrap();
