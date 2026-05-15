import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersService,
    private readonly jwt: JwtService,
  ) {}

  async login(email: string, password: string) {
    const user = await this.users.findByEmailWithHash(email);
    if (!user) throw new UnauthorizedException('Invalid credentials');
    if (!user.active) throw new UnauthorizedException('User inactive');

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) throw new UnauthorizedException('Invalid credentials');

    // Resolve permissions from profile
    let permissions: string[] = [];
    let profileId: string | null = null;
    let profileName: string | null = null;
    let profileLocationIds: string[] = [];

    const isAdmin = user.roles?.includes('ADMIN');

    if (isAdmin) {
      // ADMIN doesn't need a profile
    } else if (user.profileId && user.profile) {
      if (!user.profile.active) {
        throw new BadRequestException('El perfil asignado está inactivo');
      }
      permissions = user.profile.permissions;
      profileId = user.profile.id;
      profileName = user.profile.name;
      profileLocationIds = user.profile.locationIds || [];
    } else {
      // Non-ADMIN without profile cannot login
      throw new BadRequestException('El usuario no tiene un perfil asignado. Contacte al administrador.');
    }

    const payload = {
      sub: user.id,
      email: user.email,
      roles: user.roles,
      locationId: user.locationId,
      permissions,
      profileId,
      profileName,
      profileLocationIds,
    };

    const access_token = await this.jwt.signAsync(payload);
    return { access_token };
  }
}
