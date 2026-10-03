'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      // 1. Drop existing default
      await queryInterface.sequelize.query(
        `ALTER TABLE "organization_users" ALTER COLUMN "role" DROP DEFAULT;`,
        { transaction },
      );

      // 2. Temporarily convert column to VARCHAR(50)
      await queryInterface.sequelize.query(
        `ALTER TABLE "organization_users" 
         ALTER COLUMN "role" TYPE VARCHAR(50) 
         USING "role"::text;`,
        { transaction },
      );

      // 3. Migrate existing values: convert 'admin' to 'owner', any others to 'user'
      await queryInterface.sequelize.query(
        `UPDATE "organization_users" 
         SET "role" = 'owner' 
         WHERE LOWER("role") = 'admin' OR LOWER("role") = 'owner';`,
        { transaction },
      );

      await queryInterface.sequelize.query(
        `UPDATE "organization_users" 
         SET "role" = 'user' 
         WHERE "role" NOT IN ('owner', 'user');`,
        { transaction },
      );

      // 4. Drop the old enum type
      await queryInterface.sequelize.query(
        `DROP TYPE IF EXISTS "enum_organization_users_role";`,
        { transaction },
      );

      // 5. Create new enum type with 'owner' and 'user'
      await queryInterface.sequelize.query(
        `CREATE TYPE "enum_organization_users_role" AS ENUM ('owner', 'user');`,
        { transaction },
      );

      // 6. Cast column to the new enum type
      await queryInterface.sequelize.query(
        `ALTER TABLE "organization_users" 
         ALTER COLUMN "role" TYPE "enum_organization_users_role" 
         USING "role"::"enum_organization_users_role";`,
        { transaction },
      );

      // 7. Set default to 'user' and enforce NOT NULL
      await queryInterface.sequelize.query(
        `ALTER TABLE "organization_users" 
         ALTER COLUMN "role" SET DEFAULT 'user'::"enum_organization_users_role",
         ALTER COLUMN "role" SET NOT NULL;`,
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
        `ALTER TABLE "organization_users" ALTER COLUMN "role" DROP DEFAULT;`,
        { transaction },
      );

      await queryInterface.sequelize.query(
        `ALTER TABLE "organization_users" 
         ALTER COLUMN "role" TYPE VARCHAR(50) 
         USING "role"::text;`,
        { transaction },
      );

      await queryInterface.sequelize.query(
        `UPDATE "organization_users" 
         SET "role" = 'admin' 
         WHERE "role" = 'owner';`,
        { transaction },
      );

      await queryInterface.sequelize.query(
        `DROP TYPE IF EXISTS "enum_organization_users_role";`,
        { transaction },
      );

      await queryInterface.sequelize.query(
        `CREATE TYPE "enum_organization_users_role" AS ENUM ('admin', 'user');`,
        { transaction },
      );

      await queryInterface.sequelize.query(
        `ALTER TABLE "organization_users" 
         ALTER COLUMN "role" TYPE "enum_organization_users_role" 
         USING "role"::"enum_organization_users_role";`,
        { transaction },
      );

      await queryInterface.sequelize.query(
        `ALTER TABLE "organization_users" 
         ALTER COLUMN "role" SET DEFAULT 'user'::"enum_organization_users_role",
         ALTER COLUMN "role" SET NOT NULL;`,
        { transaction },
      );

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },
};
