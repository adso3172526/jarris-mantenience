import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPriorityToWorkOrders1742600000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS priority VARCHAR(10) NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE work_orders DROP COLUMN IF EXISTS priority`,
    );
  }
}
