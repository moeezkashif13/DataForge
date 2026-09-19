module.exports = {
  apps: [
    {
      name: 'gateway',
      script: 'proxy.js',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      env: {
        PORT: 3000,
      },
    },
    {
      name: 'api-1',
      script: 'dist/src/main.js',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      env: {
        PORT: 3001,
        NODE_ENV: 'production',
        DB_POOL_MAX: 25,
        DB_POOL_MIN: 5,
        DB_POOL_ACQUIRE: 30000,
        AUTH_DB_POOL_MAX: 5,
      },
    },
    {
      name: 'api-2',
      script: 'dist/src/main.js',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      env: {
        PORT: 3002,
        NODE_ENV: 'production',
        DB_POOL_MAX: 25,
        DB_POOL_MIN: 5,
        DB_POOL_ACQUIRE: 30000,
        AUTH_DB_POOL_MAX: 5,
      },
    },
    {
      name: 'api-3',
      script: 'dist/src/main.js',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      env: {
        PORT: 3003,
        NODE_ENV: 'production',
        DB_POOL_MAX: 25,
        DB_POOL_MIN: 5,
        DB_POOL_ACQUIRE: 30000,
        AUTH_DB_POOL_MAX: 5,
      },
    },
  ],
};
