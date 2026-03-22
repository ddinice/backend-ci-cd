import { MigrationInterface, QueryRunner } from 'typeorm';

export class PaymentsAddExternalColumns1773583000000 implements MigrationInterface {
  name = 'PaymentsAddExternalColumns1773583000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "external_payment_id" character varying(120)`,
    );
    await queryRunner.query(
      `ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "provider_ref" character varying(120)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "payments" DROP COLUMN IF EXISTS "provider_ref"`,
    );
    await queryRunner.query(
      `ALTER TABLE "payments" DROP COLUMN IF EXISTS "external_payment_id"`,
    );
  }
}
