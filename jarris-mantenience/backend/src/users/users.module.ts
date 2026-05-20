import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';

import { UserEntity } from '../entities/user.entity';
import { UserRoleEntity } from '../entities/user-role.entity';
import { UserLocationEntity } from '../entities/user-location.entity';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { ProfilesModule } from '../profiles/profiles.module';

@Module({
  imports: [ConfigModule, TypeOrmModule.forFeature([UserEntity, UserRoleEntity, UserLocationEntity]), forwardRef(() => ProfilesModule)],
  providers: [UsersService],
  controllers: [UsersController],
  exports: [UsersService],
})
export class UsersModule {}
