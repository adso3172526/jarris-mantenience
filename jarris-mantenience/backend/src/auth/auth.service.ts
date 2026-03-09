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
    // ✅ ASEGURAR: Que findByEmailWithHash cargue la relación 'location'
    const user = await this.users.findByEmailWithHash(email);
    if (!user) throw new UnauthorizedException('Invalid credentials');
    if (!user.active) throw new UnauthorizedException('User inactive');

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) throw new UnauthorizedException('Invalid credentials');

    if (!user.roles || user.roles.length === 0) {
      throw new BadRequestException('User has no roles');
    }

    // ✅ AGREGADO: locationId al payload del JWT
    const payload = { 
      sub: user.id, 
      email: user.email, 
      roles: user.roles,
      locationId: user.locationId, // ✅ NUEVO
    };
    
    const access_token = await this.jwt.signAsync(payload);
    return { access_token };
  }
}
