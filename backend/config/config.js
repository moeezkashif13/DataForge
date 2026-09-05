// require('dotenv').config();

module.exports = {
  development: {
    username: 'postgres',
    password: 'root',
    database: 'dataforge',
    host: 'localhost',
    port: 5432,
    dialect: 'postgres',
  },

  test: {
    username: 'postgres',
    password: 'root',
    database: 'dataforge_test',
    host: 'localhost',
    port: 5432,
    dialect: 'postgres',
  },

  production: {
    username: 'postgres',
    password: 'root',
    database: 'dataforge_production',
    host: 'localhost',
    port: 5432,
    dialect: 'postgres',
  },
};
