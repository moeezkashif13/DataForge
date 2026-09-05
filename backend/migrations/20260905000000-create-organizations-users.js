'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      // Enable UUID generation
      await queryInterface.sequelize.query(
        'CREATE EXTENSION IF NOT EXISTS "pgcrypto";',
        { transaction },
      );

      // 1. Organizations
      await queryInterface.createTable(
        'organizations',
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

      // 2. Users
      await queryInterface.createTable(
        'users',
        {
          id: {
            type: Sequelize.UUID,
            defaultValue: Sequelize.literal('gen_random_uuid()'),
            primaryKey: true,
            allowNull: false,
          },

          firstName: {
            type: Sequelize.STRING(255),
            allowNull: false,
          },

          lastName: {
            type: Sequelize.STRING(255),
            allowNull: false,
          },

          email: {
            type: Sequelize.STRING(255),
            allowNull: false,
            unique: true,
          },

          passwordHash: {
            type: Sequelize.STRING(255),
            allowNull: false,
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

      // 3. Organization Users
      await queryInterface.createTable(
        'organization_users',
        {
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
            defaultValue: 'user',
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

      // Prevent the same user from being added
      // to the same organization more than once.
      await queryInterface.addConstraint('organization_users', {
        fields: ['organizationId', 'userId'],
        type: 'unique',
        name: 'organization_users_organization_id_user_id_unique',
        transaction,
      });

      // Indexes
      await queryInterface.addIndex('organization_users', ['organizationId'], {
        name: 'organization_users_organization_id_idx',
        transaction,
      });

      await queryInterface.addIndex('organization_users', ['userId'], {
        name: 'organization_users_user_id_idx',
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
      // Drop in reverse dependency order.
      await queryInterface.dropTable('organization_users', {
        transaction,
      });

      await queryInterface.dropTable('users', {
        transaction,
      });

      await queryInterface.dropTable('organizations', {
        transaction,
      });

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },
};
