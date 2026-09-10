'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const [enumTypes] = await queryInterface.sequelize.query(`
      SELECT t.typname
      FROM pg_type t
      JOIN pg_namespace n ON n.oid = t.typnamespace
      WHERE t.typname = 'enum_agents_status';
    `);

    if (enumTypes.length > 0) {
      const [enumValues] = await queryInterface.sequelize.query(`
        SELECT e.enumlabel
        FROM pg_enum e
        JOIN pg_type t ON t.oid = e.enumtypid
        WHERE t.typname = 'enum_agents_status' AND e.enumlabel = 'running';
      `);

      if (enumValues.length === 0) {
        await queryInterface.sequelize.query(
          `ALTER TYPE "enum_agents_status" ADD VALUE IF NOT EXISTS 'running';`,
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
        UPDATE "agents" SET "status" = 'active' WHERE "status"::text = 'running';
      `);
    }
  },
};
