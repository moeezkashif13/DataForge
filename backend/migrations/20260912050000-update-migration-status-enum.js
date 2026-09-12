'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // 1. Normalize existing status values in migrations table
    await queryInterface.sequelize.query(`
      UPDATE "migrations" SET "status" = CASE
        WHEN "status" = 'active' THEN 'Ready'
        WHEN "status" = 'ready' THEN 'Ready'
        WHEN "status" = 'running' THEN 'Running'
        WHEN "status" = 'paused' THEN 'Paused'
        WHEN "status" = 'completed' THEN 'Completed'
        WHEN "status" = 'failed' THEN 'Failed'
        WHEN "status" = 'queued' THEN 'Queued'
        WHEN "status" IN ('Running', 'Completed', 'Paused', 'Failed', 'Ready', 'Queued') THEN "status"
        ELSE 'Ready'
      END;
    `);

    // 2. Drop existing column default so the type change can succeed
    await queryInterface.sequelize.query(
      `ALTER TABLE "migrations" ALTER COLUMN "status" DROP DEFAULT;`,
    );

    // 3. Create or update the enum type
    const [existingTypes] = await queryInterface.sequelize.query(`
      SELECT t.typname
      FROM pg_type t
      WHERE t.typname = 'enum_migrations_status';
    `);

    if (existingTypes.length === 0) {
      await queryInterface.sequelize.query(
        `CREATE TYPE "enum_migrations_status" AS ENUM ('Running', 'Completed', 'Paused', 'Failed', 'Ready', 'Queued');`,
      );
    } else {
      const requiredValues = ['Running', 'Completed', 'Paused', 'Failed', 'Ready', 'Queued'];
      for (const val of requiredValues) {
        const [found] = await queryInterface.sequelize.query(`
          SELECT e.enumlabel
          FROM pg_enum e
          JOIN pg_type t ON t.oid = e.enumtypid
          WHERE t.typname = 'enum_migrations_status' AND e.enumlabel = '${val}';
        `);
        if (found.length === 0) {
          await queryInterface.sequelize.query(
            `ALTER TYPE "enum_migrations_status" ADD VALUE IF NOT EXISTS '${val}';`,
          );
        }
      }
    }

    // 4. Cast column to the enum type
    await queryInterface.sequelize.query(
      `ALTER TABLE "migrations" ALTER COLUMN "status" TYPE "enum_migrations_status" USING "status"::"enum_migrations_status";`,
    );

    // 5. Enforce NOT NULL and default 'Ready'
    await queryInterface.sequelize.query(
      `ALTER TABLE "migrations" ALTER COLUMN "status" SET NOT NULL;`,
    );
    await queryInterface.sequelize.query(
      `ALTER TABLE "migrations" ALTER COLUMN "status" SET DEFAULT 'Ready';`,
    );
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.sequelize.query(
      `ALTER TABLE "migrations" ALTER COLUMN "status" DROP DEFAULT;`,
    );

    await queryInterface.sequelize.query(
      `ALTER TABLE "migrations" ALTER COLUMN "status" TYPE VARCHAR(50) USING "status"::text;`,
    );

    await queryInterface.sequelize.query(
      `UPDATE "migrations" SET "status" = 'active' WHERE "status" = 'Ready';`,
    );

    await queryInterface.sequelize.query(
      `ALTER TABLE "migrations" ALTER COLUMN "status" SET DEFAULT 'active';`,
    );

    await queryInterface.sequelize.query(
      `DROP TYPE IF EXISTS "enum_migrations_status";`,
    );
  },
};
