'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      // 1. Delete existing rows from migrations table as requested so NOT NULL constraints succeed
      await queryInterface.sequelize.query('DELETE FROM "migrations";', {
        transaction,
      });
      // 2. Ensure enum_migrations_source_type exists in PostgreSQL
      await queryInterface.sequelize.query(
        `DO $$
        BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_migrations_source_type') THEN
            CREATE TYPE "enum_migrations_source_type" AS ENUM ('mysql', 'postgresql', 'csv', 'json', 's3');
          END IF;
        END$$;`,
        { transaction },
      ); // 3. Add source_type column
      await queryInterface.addColumn(
        'migrations',
        'source_type',
        {
          type: Sequelize.ENUM('mysql', 'postgresql', 'csv', 'json', 's3'),
          allowNull: false,
        },
        { transaction },
      );
      // 4. Add source_schema column (default 'public', never null)
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
      // 5. Add source_database column (nullable in DB, dynamic validation in model)
      await queryInterface.addColumn(
        'migrations',
        'source_database',
        {
          type: Sequelize.STRING(255),
          allowNull: true,
        },
        { transaction },
      );
      // 6. Add source_table column (nullable in DB, dynamic validation in model)
      await queryInterface.addColumn(
        'migrations',
        'source_table',
        {
          type: Sequelize.STRING(255),
          allowNull: true,
        },
        { transaction },
      );

      // 7. Add source_file_path column (nullable in DB, dynamic validation in model)
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

  async down(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      await queryInterface.removeColumn('migrations', 'source_file_path', {
        transaction,
      });
      await queryInterface.removeColumn('migrations', 'source_table', {
        transaction,
      });
      await queryInterface.removeColumn('migrations', 'source_database', {
        transaction,
      });
      await queryInterface.removeColumn('migrations', 'source_schema', {
        transaction,
      });
      await queryInterface.removeColumn('migrations', 'source_type', {
        transaction,
      });
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
