'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // 1. Check if enum type 'enum_agents_status' exists in PostgreSQL
    const [enumTypes] = await queryInterface.sequelize.query(`
      SELECT t.typname
      FROM pg_type t
      JOIN pg_namespace n ON n.oid = t.typnamespace
      WHERE t.typname = 'enum_agents_status';
    `);

    if (enumTypes.length > 0) {
      // Check if 'connected' value is already present in the enum
      const [enumValues] = await queryInterface.sequelize.query(`
        SELECT e.enumlabel
        FROM pg_enum e
        JOIN pg_type t ON t.oid = e.enumtypid
        WHERE t.typname = 'enum_agents_status' AND e.enumlabel = 'connected';
      `);

      if (enumValues.length === 0) {
        // In PostgreSQL, ALTER TYPE ... ADD VALUE cannot run inside an explicit transaction in some PG versions
        await queryInterface.sequelize.query(
          `ALTER TYPE "enum_agents_status" ADD VALUE IF NOT EXISTS 'connected';`,
        );
      }
    } else {
      // If enum_agents_status does not exist yet, create it and cast column
      const [columns] = await queryInterface.sequelize.query(`
        SELECT data_type, udt_name
        FROM information_schema.columns
        WHERE table_name = 'agents' AND column_name = 'status';
      `);

      if (columns.length > 0) {
        await queryInterface.sequelize.query(`
          UPDATE "agents" SET "status" = 'active' WHERE "status" IS NULL;
        `);

        await queryInterface.sequelize.query(
          `CREATE TYPE "enum_agents_status" AS ENUM ('active', 'inactive', 'connected');`,
        );

        await queryInterface.sequelize.query(
          `ALTER TABLE "agents" ALTER COLUMN "status" DROP DEFAULT;`,
        );

        await queryInterface.sequelize.query(
          `ALTER TABLE "agents" ALTER COLUMN "status" TYPE "enum_agents_status" USING "status"::"enum_agents_status";`,
        );

        await queryInterface.sequelize.query(
          `ALTER TABLE "agents" ALTER COLUMN "status" SET NOT NULL;`,
        );

        await queryInterface.sequelize.query(
          `ALTER TABLE "agents" ALTER COLUMN "status" SET DEFAULT 'active';`,
        );
      }
    }
  },

  async down(queryInterface, Sequelize) {
    const [enumTypes] = await queryInterface.sequelize.query(`
      SELECT t.typname
      FROM pg_type t
      WHERE t.typname = 'enum_agents_status';
    `);

    if (enumTypes.length > 0) {
      await queryInterface.sequelize.query(`
        UPDATE "agents" SET "status" = 'active' WHERE "status"::text = 'connected';
      `);
    }
  },
};
