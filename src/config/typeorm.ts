import { DataSource, DataSourceOptions } from 'typeorm';
import { registerAs } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { IS_PRODUCTION } from './env.loader';

// When running with ts-node (e.g. seeding) we need to point to the TS sources.
// In compiled mode (nest start --watch / prod) we must load the compiled JS
// to avoid SyntaxError al intentar ejecutar archivos .ts sin transpilación.
const isTsRuntime = __filename.endsWith('.ts');

// Config base compatible con DataSource (CLI / migraciones).
const baseConfig: DataSourceOptions = {
  type: 'postgres',
  url: process.env.DATABASE_URL,
  entities: [isTsRuntime ? 'src/**/*.entity.ts' : 'dist/**/*.entity.js'],
  migrations: [isTsRuntime ? 'src/migrations/**/*{.ts,.js}' : 'dist/migrations/**/*{.js}'],
  synchronize: !IS_PRODUCTION,
  logging: IS_PRODUCTION,
  //logger: 'advanced-console',
  //logNotifications: true,
  //dropSchema: true,
  // ssl: { rejectUnauthorized: false },
  // uuidExtension: 'pgcrypto',
};

// TypeOrmModuleOptions incluye opciones extra de Nest (p. ej. autoLoadEntities).
const config = {
  ...baseConfig,
  autoLoadEntities: true,
} satisfies TypeOrmModuleOptions;

export default registerAs<TypeOrmModuleOptions>('typeorm', () => config);

export const connectionSource = new DataSource(baseConfig); // migraciones desde cli
