import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AppController } from './app.controller';

import { CategoriesModule } from './categories/categories.module';
import { LocationsModule } from './locations/locations.module';
import { AssetsModule } from './assets/assets.module';
import { AssetEventsModule } from './asset-events/asset-events.module';
import { WorkOrdersModule } from './work-orders/work-orders.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { ReportsModule } from './reports/reports.module';
import { LocativeCategoriesModule } from './locative-categories/locative-categories.module';
import { APP_GUARD } from '@nestjs/core';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';


@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get<string>('DB_HOST'),
        port: Number(config.get<string>('DB_PORT')),
        username: config.get<string>('DB_USER'),
        password: config.get<string>('DB_PASSWORD'),
        database: config.get<string>('DB_NAME'),
        autoLoadEntities: true,
        synchronize: true,
        logging: ['error'],
        extra: {
          options: '-c timezone=America/Bogota',
        },
      }),
    }),

    CategoriesModule,
    LocationsModule,
    AssetsModule,
    AssetEventsModule,
    WorkOrdersModule,
    UsersModule,
    AuthModule,
    ReportsModule,
    LocativeCategoriesModule,
  ],
  controllers: [AppController],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard }, // JWT global
    { provide: APP_GUARD, useClass: RolesGuard },   // Roles global
  ],
})
export class AppModule {}
