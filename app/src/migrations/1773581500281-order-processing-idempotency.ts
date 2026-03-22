import { MigrationInterface, QueryRunner } from 'typeorm';

export class OrderProcessingIdempotency1773581500281 implements MigrationInterface {
  name = 'OrderProcessingIdempotency1773581500281';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "processed_at" timestamptz NULL`,
    );

    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "processed_messages" (
            "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
            "message_id" uuid NOT NULL,
            "order_id" uuid NOT NULL,
            "handler" varchar(100),
            "processed_at" timestamptz NOT NULL DEFAULT now(),
            CONSTRAINT "IDX_processed_messages_message_id_unique" UNIQUE ("message_id")
          )`,
    );

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_processed_messages_order_id" ON "processed_messages" ("order_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "processed_messages"`);
    await queryRunner.query(
      `ALTER TABLE "orders" DROP COLUMN IF EXISTS "processed_at"`,
    );
  }
}
