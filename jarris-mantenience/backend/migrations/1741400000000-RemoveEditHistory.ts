import { MigrationInterface, QueryRunner } from 'typeorm';

export class RemoveEditHistory1741400000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE assets DROP COLUMN IF EXISTS "editHistory"
    `);
    await queryRunner.query(`
      ALTER TABLE asset_events DROP COLUMN IF EXISTS "editHistory"
    `);
    await queryRunner.query(`
      ALTER TABLE work_orders DROP COLUMN IF EXISTS "editHistory"
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE assets ADD COLUMN "editHistory" jsonb DEFAULT '[]'::jsonb
    `);
    await queryRunner.query(`
      ALTER TABLE asset_events ADD COLUMN "editHistory" jsonb DEFAULT '[]'::jsonb
    `);
    await queryRunner.query(`
      ALTER TABLE work_orders ADD COLUMN "editHistory" jsonb DEFAULT '[]'::jsonb
    `);
  }
}
