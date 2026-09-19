import '../load-env';

/**
 * Centralized Database & Connection Pool Configuration
 *
 * Capacity Planning Formula:
 * Total Active DB Sockets = (sequelizePool.max + betterAuthPool.max) * PM2_INSTANCES
 *
 * Example:
 * 1 instance:  (20 + 10) * 1 = 30 connections  (Safe under PostgreSQL default max_connections = 100)
 * 3 instances: (15 + 5)  * 3 = 60 connections  (Safe under PostgreSQL default max_connections = 100)
 */
export const databaseConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 5432,
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'root',
  database: process.env.DB_NAME || 'dataforge',

  // Sequelize ORM Connection Pool (application queries & transactions)
  sequelizePool: {
    max: Number(process.env.DB_POOL_MAX) || 15,
    min: Number(process.env.DB_POOL_MIN) || 5,
    acquire: Number(process.env.DB_POOL_ACQUIRE) || 10000,
    idle: Number(process.env.DB_POOL_IDLE) || 10000,
  },

  // Better-Auth Connection Pool (pg.Pool for session verification)
  betterAuthPool: {
    max: Number(process.env.AUTH_DB_POOL_MAX) || 5,
    idleTimeoutMillis: Number(process.env.AUTH_DB_POOL_IDLE) || 10000,
    connectionTimeoutMillis: Number(process.env.AUTH_DB_POOL_ACQUIRE) || 10000,
  },
};
