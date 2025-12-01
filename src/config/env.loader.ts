import { config, DotenvConfigOptions } from 'dotenv';

const dotenvConfig = config as (options: DotenvConfigOptions) => void;

// Environment variables
export const NODE_ENV = process.env.NODE_ENV || 'development';
const envFile = `.env.${NODE_ENV}`;
dotenvConfig({ path: envFile });

// Environment flags
export const IS_PRODUCTION = NODE_ENV === 'production';
export const IS_TEST = NODE_ENV === 'test';
export const IS_DEVELOPMENT = NODE_ENV === 'development';

// Server variables
export const PORT = Number(process.env.PORT) || 3000;

// Database variables
export const DATABASE_URL = process.env.DATABASE_URL;

// Frontend variables
export const FRONTEND_URL = process.env.FRONTEND_URL;

// CORS variables
export const CORS_ORIGIN = process.env.CORS_ORIGIN;

// Logger variables
export const LOGGER_LEVEL = process.env.LOGGER_LEVEL;
export const FULL_LOGS = process.env.FULL_LOGS === 'true';

// Rate limit variables
export const RATE_LIMIT_TTL = Number(process.env.RATE_LIMIT_TTL) || 60; // 60 seconds
export const RATE_LIMIT_LIMIT = Number(process.env.RATE_LIMIT_LIMIT) || 100; // 100 requests
