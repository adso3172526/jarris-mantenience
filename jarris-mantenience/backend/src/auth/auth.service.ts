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

    // Extract roles from normalized table
    const roles = (user.userRoles || []).map(ur => ur.role);

    // Resolve permissions from profile
    let permissions: string[] = [];
    let profileId: string | null = null;
    let profileName: string | null = null;

    const isAdmin = roles.includes('ADMIN');

    if (isAdmin) {
      // ADMIN doesn't need a profile
    } else if (user.profileId && user.profile) {
      if (!user.profile.active) {
        throw new BadRequestException('El perfil asignado está inactivo');
      }
      permissions = (user.profile.profilePermissions || []).map(pp => pp.permission);
      profileId = user.profile.id;
      profileName = user.profile.name;
    } else {
      // Non-ADMIN without profile cannot login
      throw new BadRequestException('El usuario no tiene un perfil asignado. Contacte al administrador.');
    }

    // Extract location IDs from normalized table
    const profileLocationIds = (user.userLocations || []).map(ul => ul.locationId);

    const payload = {
      sub: user.id,
      email: user.email,
      roles,
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
