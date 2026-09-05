import { QueryInterface, DataTypes } from 'sequelize';

export async function up(queryInterface: QueryInterface) {
  const transaction = await queryInterface.sequelize.transaction();

  try {
    // 1. Create the ENUM type explicitly in PostgreSQL
    await queryInterface.sequelize.query(
      `CREATE TYPE "enum_organization_users_role" AS ENUM ('admin', 'user');`,
      { transaction },
    );

    // 2. Drop the existing DEFAULT constraint from the VARCHAR column
    await queryInterface.sequelize.query(
      `ALTER TABLE "organization_users" ALTER COLUMN "role" DROP DEFAULT;`,
      { transaction },
    );

    // 3. Alter column type using explicit casting
    await queryInterface.sequelize.query(
      `ALTER TABLE "organization_users" 
       ALTER COLUMN "role" TYPE "enum_organization_users_role" 
       USING "role"::"enum_organization_users_role";`,
      { transaction },
    );

    // 4. Set the new default value and preserve NOT NULL constraint
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
}

export async function down(queryInterface: QueryInterface) {
  const transaction = await queryInterface.sequelize.transaction();

  try {
    // 1. Drop current ENUM default
    await queryInterface.sequelize.query(
      `ALTER TABLE "organization_users" ALTER COLUMN "role" DROP DEFAULT;`,
      { transaction },
    );

    // 2. Revert column back to VARCHAR(50)
    await queryInterface.sequelize.query(
      `ALTER TABLE "organization_users" 
       ALTER COLUMN "role" TYPE VARCHAR(50) 
       USING "role"::VARCHAR(50);`,
      { transaction },
    );

    // 3. Restore original default value
    await queryInterface.sequelize.query(
      `ALTER TABLE "organization_users" 
       ALTER COLUMN "role" SET DEFAULT 'user',
       ALTER COLUMN "role" SET NOT NULL;`,
      { transaction },
    );

    // 4. Clean up the ENUM type
    await queryInterface.sequelize.query(
      `DROP TYPE IF EXISTS "enum_organization_users_role";`,
      { transaction },
    );

    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}
