'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      await queryInterface.createTable(
        'migrations',
        {
          id: {
            type: Sequelize.UUID,
            defaultValue: Sequelize.literal('gen_random_uuid()'),
            primaryKey: true,
            allowNull: false,
          },

          name: {
            type: Sequelize.STRING(255),
            allowNull: false,
          },

          description: {
            type: Sequelize.TEXT,
            allowNull: true,
          },

          source_path: {
            type: Sequelize.STRING(1000),
            allowNull: false,
          },

          target_path: {
            type: Sequelize.STRING(1000),
            allowNull: false,
          },

          status: {
            type: Sequelize.STRING(50),
            allowNull: false,
            defaultValue: 'active',
          },

          project_id: {
            type: Sequelize.UUID,
            allowNull: false,
            references: {
              model: 'projects',
              key: 'id',
            },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE',
          },

          created_by: {
            type: Sequelize.UUID,
            allowNull: true,
            references: {
              model: 'users',
              key: 'id',
            },
            onUpdate: 'CASCADE',
            onDelete: 'SET NULL',
          },

          createdAt: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
          },

          updatedAt: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
          },
        },
        { transaction },
      );

      await queryInterface.addIndex('migrations', ['project_id'], {
        name: 'migrations_project_id_idx',
        transaction,
      });

      await queryInterface.addIndex('migrations', ['created_by'], {
        name: 'migrations_created_by_idx',
        transaction,
      });

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  async down(queryInterface) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      await queryInterface.dropTable('migrations', { transaction });
      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },
};
