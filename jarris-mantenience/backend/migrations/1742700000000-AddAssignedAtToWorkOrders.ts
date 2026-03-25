import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAssignedAtToWorkOrders1742700000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS "assignedAt" TIMESTAMPTZ NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE work_orders DROP COLUMN IF EXISTS "assignedAt"`,
    );
  }
}
