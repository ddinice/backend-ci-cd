import { MigrationInterface, QueryRunner } from 'typeorm';

export class Init1773577602047 implements MigrationInterface {
  name = 'Init1773577602047';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "orders" (
              "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
              "created_at" timestamptz NOT NULL DEFAULT now(),
              "updated_at" timestamptz NOT NULL DEFAULT now()
            )`,
    );
    await queryRunner.query(
      `CREATE TABLE "order_items" (
              "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
              "order_id" uuid NOT NULL,
              "quantity" int NOT NULL,
              "price_at_purchase" numeric(12,2) NOT NULL,
              CONSTRAINT "FK_order_items_order" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE
            )`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_order_items_order_id" ON "order_items" ("order_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS "order_items"');
    await queryRunner.query('DROP TABLE IF EXISTS "orders"');
    await queryRunner.query('DROP EXTENSION IF EXISTS "uuid-ossp"');
  }
}
