import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMaintenanceTypeToWorkOrders1737141000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Agregar columnas nuevas
    await queryRunner.query(`
      ALTER TABLE work_orders
      ADD COLUMN maintenance_type VARCHAR(20) DEFAULT 'EQUIPO',
      ADD COLUMN locative_category VARCHAR(50)
    `);

    // 2. Actualizar OT existentes para marcarlas como 'EQUIPO'
    await queryRunner.query(`
      UPDATE work_orders
      SET maintenance_type = 'EQUIPO'
      WHERE asset_id IS NOT NULL
    `);

    // 3. Hacer asset_id NULLABLE (permitir OT sin asset para locativo)
    await queryRunner.query(`
      ALTER TABLE work_orders
      ALTER COLUMN asset_id DROP NOT NULL
    `);

    // 4. Agregar constraint de validación
    await queryRunner.query(`
      ALTER TABLE work_orders
      ADD CONSTRAINT check_maintenance_type_asset
      CHECK (
        (maintenance_type = 'EQUIPO' AND asset_id IS NOT NULL) OR
        (maintenance_type = 'LOCATIVO' AND asset_id IS NULL)
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Revertir cambios
    await queryRunner.query(`
      ALTER TABLE work_orders
      DROP CONSTRAINT IF EXISTS check_maintenance_type_asset
    `);
    
    await queryRunner.query(`
      ALTER TABLE work_orders
      DROP COLUMN IF EXISTS locative_category,
      DROP COLUMN IF EXISTS maintenance_type
    `);
    
    // Nota: NO revertimos asset_id a NOT NULL porque podría haber datos locativos
  }
}
