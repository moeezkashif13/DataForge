'use strict';

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

      if (existingColumns.includes('source_path')) {
        await queryInterface.removeColumn('migrations', 'source_path', { transaction });
      }

      if (existingColumns.includes('target_path')) {
        await queryInterface.removeColumn('migrations', 'target_path', { transaction });
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
      await queryInterface.addColumn(
        'migrations',
        'source_path',
        {
          type: Sequelize.STRING(1000),
          allowNull: true,
        },
        { transaction },
      );

      await queryInterface.addColumn(
        'migrations',
        'target_path',
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
};
