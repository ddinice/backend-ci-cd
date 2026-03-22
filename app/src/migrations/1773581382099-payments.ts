import { MigrationInterface, QueryRunner } from 'typeorm';

export class Payments1773581382099 implements MigrationInterface {
  name = 'Payments1773581382099';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      "CREATE TYPE \"payments_status_enum\" AS ENUM ('UNPAID', 'PENDING', 'PAID', 'FAILED', 'REFUNDED')",
    );

    await queryRunner.query(`
          CREATE TABLE "payments" (
            "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
            "order_id" uuid NOT NULL,
            "status" "payments_status_enum" NOT NULL DEFAULT 'UNPAID',
            "created_at" timestamptz NOT NULL DEFAULT now(),
            "updated_at" timestamptz NOT NULL DEFAULT now(),
            CONSTRAINT "UQ_payments_order_id" UNIQUE ("order_id"),
            CONSTRAINT "FK_payments_order" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE
          )
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE "payments"');
    await queryRunner.query('DROP TYPE "payments_status_enum"');
  }
}
