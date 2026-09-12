'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      // 1. Inspect existing columns to ensure safe, idempotent migration
      const [columns] = await queryInterface.sequelize.query(
        `SELECT column_name
         FROM information_schema.columns
         WHERE table_name = 'migrations';`,
        { transaction },
      );
      const existingColumns = columns.map((col) => col.column_name);

      // 2. Ensure enum_migrations_source_type exists in PostgreSQL
      await queryInterface.sequelize.query(
        `DO $$
        BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_migrations_source_type') THEN
            CREATE TYPE "enum_migrations_source_type" AS ENUM ('mysql', 'postgresql', 'csv', 'json', 's3');
          END IF;
        END$$;`,
        { transaction },
      );

      // 3. Add source_type column (enum: mysql, postgresql, csv, json, s3, not null, no permanent default)
      if (!existingColumns.includes('source_type')) {
        await queryInterface.addColumn(
          'migrations',
          'source_type',
          {
            type: Sequelize.ENUM('mysql', 'postgresql', 'csv', 'json', 's3'),
            allowNull: false,
            defaultValue: 'postgresql',
          },
          { transaction },
        );

        // Remove the default so future rows must explicitly specify source_type
        await queryInterface.sequelize.query(
          'ALTER TABLE "migrations" ALTER COLUMN "source_type" DROP DEFAULT;',
          { transaction },
        );
      }

      // 4. Add source_schema column (default 'public', never null)
      if (!existingColumns.includes('source_schema')) {
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
      }

      // 5. Add source_database column (nullable in DB, dynamic validation in model)
      if (!existingColumns.includes('source_database')) {
        await queryInterface.addColumn(
          'migrations',
          'source_database',
          {
            type: Sequelize.STRING(255),
            allowNull: true,
          },
          { transaction },
        );
      }

      // 6. Add source_table column (nullable in DB, dynamic validation in model)
      if (!existingColumns.includes('source_table')) {
        await queryInterface.addColumn(
          'migrations',
          'source_table',
          {
            type: Sequelize.STRING(255),
            allowNull: true,
          },
          { transaction },
        );
      }

      // 7. Add source_file_path column (nullable in DB, dynamic validation in model)
      if (!existingColumns.includes('source_file_path')) {
        await queryInterface.addColumn(
          'migrations',
          'source_file_path',
          {
            type: Sequelize.STRING(1000),
            allowNull: true,
          },
          { transaction },
        );
      }

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      const [columns] = await queryInterface.sequelize.query(
        `SELECT column_name
         FROM information_schema.columns
         WHERE table_name = 'migrations';`,
        { transaction },
      );
      const existingColumns = columns.map((col) => col.column_name);

      if (existingColumns.includes('source_file_path')) {
        await queryInterface.removeColumn('migrations', 'source_file_path', {
          transaction,
        });
      }

      if (existingColumns.includes('source_table')) {
        await queryInterface.removeColumn('migrations', 'source_table', {
          transaction,
        });
      }

      if (existingColumns.includes('source_database')) {
        await queryInterface.removeColumn('migrations', 'source_database', {
          transaction,
        });
      }

      if (existingColumns.includes('source_schema')) {
        await queryInterface.removeColumn('migrations', 'source_schema', {
          transaction,
        });
      }

      if (existingColumns.includes('source_type')) {
        await queryInterface.removeColumn('migrations', 'source_type', {
          transaction,
        });
      }

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
};
