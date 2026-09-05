'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      // Normalize any existing NULL/mismatched values first.
      await queryInterface.sequelize.query(
        `UPDATE "projects" SET "status" = 'active' WHERE "status" IS NULL;`,
        { transaction },
      );

      // Drop any existing default so the type cast can succeed.
      await queryInterface.sequelize.query(
        `ALTER TABLE "projects" ALTER COLUMN "status" DROP DEFAULT;`,
        { transaction },
      );

      // Create the enum type (name matches Sequelize convention).
      await queryInterface.sequelize.query(
        `CREATE TYPE "enum_projects_status" AS ENUM ('active', 'archived');`,
        { transaction },
      );

      // Cast the existing column to the enum type.
      await queryInterface.sequelize.query(
        `ALTER TABLE "projects" ALTER COLUMN "status" TYPE "enum_projects_status" USING "status"::"enum_projects_status";`,
        { transaction },
      );

      // Enforce NOT NULL and default 'active'.
      await queryInterface.sequelize.query(
        `ALTER TABLE "projects" ALTER COLUMN "status" SET NOT NULL;`,
        { transaction },
      );
      await queryInterface.sequelize.query(
        `ALTER TABLE "projects" ALTER COLUMN "status" SET DEFAULT 'active';`,
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
        `ALTER TABLE "projects" ALTER COLUMN "status" DROP DEFAULT;`,
        { transaction },
      );

      await queryInterface.sequelize.query(
        `ALTER TABLE "projects" ALTER COLUMN "status" TYPE VARCHAR(50) USING "status"::text;`,
        { transaction },
      );

      await queryInterface.sequelize.query(
        `ALTER TABLE "projects" ALTER COLUMN "status" DROP NOT NULL;`,
        { transaction },
      );

      await queryInterface.sequelize.query(
        `DROP TYPE IF EXISTS "enum_projects_status";`,
        { transaction },
      );

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },
};