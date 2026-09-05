'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      // 1. Extend existing "users" table for Better Auth.
      await queryInterface.addColumn(
        'users',
        'name',
        {
          type: Sequelize.STRING(255),
          allowNull: false,
          defaultValue: '',
        },
        { transaction },
      );

      await queryInterface.changeColumn(
        'users',
        'firstName',
        {
          type: Sequelize.STRING(255),
          allowNull: true,
        },
        { transaction },
      );

      await queryInterface.changeColumn(
        'users',
        'lastName',
        {
          type: Sequelize.STRING(255),
          allowNull: true,
        },
        { transaction },
      );

      await queryInterface.addColumn(
        'users',
        'emailVerified',
        {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
        { transaction },
      );

      await queryInterface.addColumn(
        'users',
        'image',
        {
          type: Sequelize.TEXT,
          allowNull: true,
        },
        { transaction },
      );

      // Password hashing is now handled by Better Auth in the "account" table.
      await queryInterface.removeColumn('users', 'passwordHash', { transaction });

      // 2. Sessions
      await queryInterface.createTable(
        'session',
        {
          id: {
            type: Sequelize.STRING(255),
            allowNull: false,
            primaryKey: true,
          },
          token: {
            type: Sequelize.STRING(255),
            allowNull: false,
            unique: true,
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
          expiresAt: {
            type: Sequelize.DATE,
            allowNull: false,
          },
          ipAddress: {
            type: Sequelize.STRING(255),
            allowNull: true,
          },
          userAgent: {
            type: Sequelize.TEXT,
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

      // 3. Accounts (stores provider and password hashes)
      await queryInterface.createTable(
        'account',
        {
          id: {
            type: Sequelize.STRING(255),
            allowNull: false,
            primaryKey: true,
          },
          issuer: {
            type: Sequelize.STRING(255),
            allowNull: false,
            defaultValue: 'local:credential',
          },
          accountId: {
            type: Sequelize.STRING(255),
            allowNull: false,
          },
          providerId: {
            type: Sequelize.STRING(255),
            allowNull: false,
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
          accessToken: {
            type: Sequelize.TEXT,
            allowNull: true,
          },
          refreshToken: {
            type: Sequelize.TEXT,
            allowNull: true,
          },
          idToken: {
            type: Sequelize.TEXT,
            allowNull: true,
          },
          accessTokenExpiresAt: {
            type: Sequelize.DATE,
            allowNull: true,
          },
          refreshTokenExpiresAt: {
            type: Sequelize.DATE,
            allowNull: true,
          },
          scope: {
            type: Sequelize.TEXT,
            allowNull: true,
          },
          password: {
            type: Sequelize.TEXT,
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

      // 4. Verifications
      await queryInterface.createTable(
        'verification',
        {
          id: {
            type: Sequelize.STRING(255),
            allowNull: false,
            primaryKey: true,
          },
          identifier: {
            type: Sequelize.STRING(255),
            allowNull: false,
          },
          value: {
            type: Sequelize.TEXT,
            allowNull: false,
          },
          expiresAt: {
            type: Sequelize.DATE,
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

      await queryInterface.addIndex('session', ['userId'], {
        name: 'session_user_id_idx',
        transaction,
      });

      await queryInterface.addIndex('account', ['userId'], {
        name: 'account_user_id_idx',
        transaction,
      });

      await queryInterface.addIndex('account', ['issuer', 'accountId'], {
        name: 'account_issuer_account_id_idx',
        unique: true,
        transaction,
      });

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      await queryInterface.dropTable('verification', { transaction });
      await queryInterface.dropTable('account', { transaction });
      await queryInterface.dropTable('session', { transaction });

      await queryInterface.removeColumn('users', 'image', { transaction });
      await queryInterface.removeColumn('users', 'emailVerified', { transaction });
      await queryInterface.removeColumn('users', 'name', { transaction });

      await queryInterface.changeColumn(
        'users',
        'firstName',
        {
          type: Sequelize.STRING(255),
          allowNull: false,
          defaultValue: '',
        },
        { transaction },
      );

      await queryInterface.changeColumn(
        'users',
        'lastName',
        {
          type: Sequelize.STRING(255),
          allowNull: false,
          defaultValue: '',
        },
        { transaction },
      );

      await queryInterface.addColumn(
        'users',
        'passwordHash',
        {
          type: Sequelize.STRING(255),
          allowNull: false,
          defaultValue: '',
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