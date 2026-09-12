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

      // 2. Ensure enum_migrations_target_type exists in PostgreSQL
      await queryInterface.sequelize.query(
        `DO $$
        BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_migrations_target_type') THEN
            CREATE TYPE "enum_migrations_target_type" AS ENUM ('mysql', 'postgresql');
          END IF;
        END$$;`,
        { transaction },
      );

      // 3. Add target_type column (enum: mysql, postgresql, not null, no permanent default)
      if (!existingColumns.includes('target_type')) {
        await queryInterface.addColumn(
          'migrations',
          'target_type',
          {
            type: Sequelize.ENUM('mysql', 'postgresql'),
            allowNull: false,
            defaultValue: 'postgresql',
          },
          { transaction },
        );

        // Remove default so future rows must explicitly specify target_type
        await queryInterface.sequelize.query(
          'ALTER TABLE "migrations" ALTER COLUMN "target_type" DROP DEFAULT;',
          { transaction },
        );
      }

      // 4. Add target_schema column (default 'public', never null)
      if (!existingColumns.includes('target_schema')) {
        await queryInterface.addColumn(
          'migrations',
          'target_schema',
          {
            type: Sequelize.STRING(255),
            allowNull: false,
            defaultValue: 'public',
          },
          { transaction },
        );
      }

      // 5. Add target_database column (not null, no permanent default)
      if (!existingColumns.includes('target_database')) {
        await queryInterface.addColumn(
          'migrations',
          'target_database',
          {
            type: Sequelize.STRING(255),
            allowNull: false,
            defaultValue: 'analytics',
          },
          { transaction },
        );

        // Remove default so future rows must explicitly specify target_database
        await queryInterface.sequelize.query(
          'ALTER TABLE "migrations" ALTER COLUMN "target_database" DROP DEFAULT;',
          { transaction },
        );
      }

      // 6. Add target_table column (not null, no permanent default)
      if (!existingColumns.includes('target_table')) {
        await queryInterface.addColumn(
          'migrations',
          'target_table',
          {
            type: Sequelize.STRING(255),
            allowNull: false,
            defaultValue: 'customers_v2',
          },
          { transaction },
        );

        // Remove default so future rows must explicitly specify target_table
        await queryInterface.sequelize.query(
          'ALTER TABLE "migrations" ALTER COLUMN "target_table" DROP DEFAULT;',
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

      if (existingColumns.includes('target_table')) {
        await queryInterface.removeColumn('migrations', 'target_table', {
          transaction,
        });
      }

      if (existingColumns.includes('target_database')) {
        await queryInterface.removeColumn('migrations', 'target_database', {
          transaction,
        });
      }

      if (existingColumns.includes('target_schema')) {
        await queryInterface.removeColumn('migrations', 'target_schema', {
          transaction,
        });
      }

      if (existingColumns.includes('target_type')) {
        await queryInterface.removeColumn('migrations', 'target_type', {
          transaction,
        });
      }

      await queryInterface.sequelize.query(
        'DROP TYPE IF EXISTS "enum_migrations_target_type";',
        { transaction },
      );

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },
};
