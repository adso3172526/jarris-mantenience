import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddEventTypeToWorkOrders1741500000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS event_type VARCHAR(20) NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE work_orders DROP COLUMN IF EXISTS event_type`,
    );
  }
}
