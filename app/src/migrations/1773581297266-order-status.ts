import { MigrationInterface, QueryRunner } from 'typeorm';

export class OrderStatus1773581297266 implements MigrationInterface {
  name = 'OrderStatus1773581297266';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      "CREATE TYPE \"orders_status_enum\" AS ENUM ('CREATED', 'PAID', 'CANCELLED')",
    );

    await queryRunner.query(
      'ALTER TABLE "orders" ADD COLUMN "status" "orders_status_enum" NOT NULL DEFAULT \'CREATED\'',
    );

    await queryRunner.query(
      'CREATE INDEX "IDX_orders_created_at" ON "orders" ("created_at")',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX IF EXISTS "IDX_orders_created_at"');
    await queryRunner.query('ALTER TABLE "orders" DROP COLUMN "status"');
    await queryRunner.query('DROP TYPE IF EXISTS "orders_status_enum"');
  }
}
