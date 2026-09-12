'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      // 1. Check existing columns in migrations table
      const [columns] = await queryInterface.sequelize.query(
        `SELECT column_name
         FROM information_schema.columns
         WHERE table_name = 'migrations';`,
        { transaction },
      );

      const existingColumns = columns.map((col) => col.column_name);

      if (existingColumns.includes('source_file_path')) {
        await queryInterface.removeColumn('migrations', 'source_file_path', { transaction });
      }

      if (existingColumns.includes('source_table')) {
        await queryInterface.removeColumn('migrations', 'source_table', { transaction });
      }

      if (existingColumns.includes('source_database')) {
        await queryInterface.removeColumn('migrations', 'source_database', { transaction });
      }

      if (existingColumns.includes('source_schema')) {
        await queryInterface.removeColumn('migrations', 'source_schema', { transaction });
      }

      if (existingColumns.includes('source_type')) {
        await queryInterface.removeColumn('migrations', 'source_type', { transaction });
      }

      // 2. Drop the enum type if it exists in PostgreSQL
      await queryInterface.sequelize.query(
        'DROP TYPE IF EXISTS "enum_migrations_source_type";',
        { transaction },
      );

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      await queryInterface.sequelize.query(
        `DO $$
        BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_migrations_source_type') THEN
            CREATE TYPE "enum_migrations_source_type" AS ENUM ('mysql', 'postgresql', 'csv', 'json', 's3');
          END IF;
        END$$;`,
        { transaction },
      );

      await queryInterface.addColumn(
        'migrations',
        'source_type',
        {
          type: Sequelize.ENUM('mysql', 'postgresql', 'csv', 'json', 's3'),
          allowNull: false,
        },
        { transaction },
      );

      await queryInterface.addColumn(
        'migrations',
        'source_schema',
        {
          type: Sequelize.STRING(255),
          allowNull: false,
          defaultValue: 'public',
        },
        { transaction },
      );

      await queryInterface.addColumn(
        'migrations',
        'source_database',
        {
          type: Sequelize.STRING(255),
          allowNull: true,
        },
        { transaction },
      );

      await queryInterface.addColumn(
        'migrations',
        'source_table',
        {
          type: Sequelize.STRING(255),
          allowNull: true,
        },
        { transaction },
      );

      await queryInterface.addColumn(
        'migrations',
        'source_file_path',
        {
          type: Sequelize.STRING(1000),
          allowNull: true,
        },
        { transaction },
      );

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },
};
