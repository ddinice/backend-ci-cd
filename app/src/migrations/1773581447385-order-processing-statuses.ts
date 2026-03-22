import { MigrationInterface, QueryRunner } from 'typeorm';

export class OrderProcessingStatuses1773581447385 implements MigrationInterface {
  name = 'OrderProcessingStatuses1773581447385';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TYPE "orders_status_enum" ADD VALUE IF NOT EXISTS 'PENDING'`,
    );
    await queryRunner.query(
      `ALTER TYPE "orders_status_enum" ADD VALUE IF NOT EXISTS 'PROCESSED'`,
    );
  }

  public async down(): Promise<void> {}
}
