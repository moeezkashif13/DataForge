'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      // 1. Projects
      await queryInterface.createTable(
        'projects',
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

          organizationId: {
            type: Sequelize.UUID,
            allowNull: false,

            references: {
              model: 'organizations',
              key: 'id',
            },

            onUpdate: 'CASCADE',
            onDelete: 'CASCADE',
          },

          status: {
            type: Sequelize.STRING(50),
            allowNull: true,
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

      await queryInterface.addIndex('projects', ['organizationId'], {
        name: 'projects_organization_id_idx',
        transaction,
      });

      // 2. Project Users (junction table)
      await queryInterface.createTable(
        'project_users',
        {
          id: {
            type: Sequelize.UUID,
            defaultValue: Sequelize.literal('gen_random_uuid()'),
            primaryKey: true,
            allowNull: false,
          },

          projectId: {
            type: Sequelize.UUID,
            allowNull: false,

            references: {
              model: 'projects',
              key: 'id',
            },

            onUpdate: 'CASCADE',
            onDelete: 'CASCADE',
          },

          userId: {
            type: Sequelize.UUID,
            allowNull: false,

            references: {
              model: 'users',
              key: 'id',
            },

            onUpdate: 'CASCADE',
            onDelete: 'CASCADE',
          },

          role: {
            type: Sequelize.STRING(50),
            allowNull: false,
            defaultValue: 'member',
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

      // Prevent adding the same user to the same project more than once.
      await queryInterface.addConstraint('project_users', {
        fields: ['projectId', 'userId'],
        type: 'unique',
        name: 'project_users_project_id_user_id_unique',
        transaction,
      });

      await queryInterface.addIndex('project_users', ['projectId'], {
        name: 'project_users_project_id_idx',
        transaction,
      });

      await queryInterface.addIndex('project_users', ['userId'], {
        name: 'project_users_user_id_idx',
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
      await queryInterface.dropTable('project_users', { transaction });
      await queryInterface.dropTable('projects', { transaction });
      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },
};