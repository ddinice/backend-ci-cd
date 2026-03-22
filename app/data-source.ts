import * as dotenv from 'dotenv';
import { DataSource } from 'typeorm';

dotenv.config({
  path: `.env.${process.env.NODE_ENV || 'example'}`,
});
console.log(process.env.NODE_ENV);
console.log(process.env.DB_HOST);
console.log(process.env.DB_PORT);
console.log(process.env.DB_PASS);
console.log(process.env.DB_NAME);

const dataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  username: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  entities: ['src/**/*.entity{.ts,.js}'],
  migrations: ['src/migrations/*{.ts,.js}'],
  synchronize: false
});

export default dataSource;