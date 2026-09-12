'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      const [columns] = await queryInterface.sequelize.query(
        `SELECT column_name
         FROM information_schema.columns
         WHERE table_name = 'migrations';`,
        { transaction },
      );
      const existingColumns = columns.map((col) => col.column_name);

      if (!existingColumns.includes('mappings')) {
        await queryInterface.addColumn(
          'migrations',
          'mappings',
          {
            type: Sequelize.JSON,
            allowNull: false,
            defaultValue: [],
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

      if (existingColumns.includes('mappings')) {
        await queryInterface.removeColumn('migrations', 'mappings', {
          transaction,
        });
      }

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },
};
