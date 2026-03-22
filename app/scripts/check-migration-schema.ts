import 'reflect-metadata';
import dataSource from '../data-source';

async function main(): Promise<void> {
  await dataSource.initialize();
  try {
    await dataSource.runMigrations();
    const stillPending = await dataSource.showMigrations();
    if (stillPending) {
      console.error('Migrations are still pending after runMigrations().');
      process.exit(1);
    }
    console.log('OK: migrations applied successfully.');
  } finally {
    await dataSource.destroy();
  }
}

void main().catch((e: unknown) => {
  console.error(e);
  process.exit(1);
});
