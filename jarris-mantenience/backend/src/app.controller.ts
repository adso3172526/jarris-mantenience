import { Controller, Get } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Controller()
export class AppController {
  constructor(private readonly dataSource: DataSource) {}

  @Get('env')
  envTest() {
    return {
      DB_HOST: process.env.DB_HOST,
      DB_PORT: process.env.DB_PORT,
      DB_NAME: process.env.DB_NAME,
      DB_USER: process.env.DB_USER,
      DB_PASSWORD_TYPE: typeof process.env.DB_PASSWORD,
      DB_PASSWORD_VALUE: process.env.DB_PASSWORD,
    };
  }

  @Get('health/db')
  async dbHealth() {
    const result = await this.dataSource.query('SELECT 1 as ok');
    return { ok: true, db: result[0].ok };
  }
}
