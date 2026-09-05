'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      await queryInterface.createTable(
        'organization_invitations',
        {
          id: {
            type: Sequelize.UUID,
            defaultValue: Sequelize.literal('gen_random_uuid()'),
            primaryKey: true,
            allowNull: false,
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

          invitedBy: {
            type: Sequelize.UUID,
            allowNull: true,

            references: {
              model: 'users',
              key: 'id',
            },

            onUpdate: 'CASCADE',
            onDelete: 'SET NULL',
          },

          email: {
            type: Sequelize.STRING(255),
            allowNull: false,
          },

          token: {
            type: Sequelize.STRING(255),
            allowNull: false,
            unique: true,
          },

          status: {
            type: Sequelize.ENUM('pending', 'accepted', 'expired', 'revoked'),
            allowNull: false,
            defaultValue: 'pending',
          },

          expiresAt: {
            type: Sequelize.DATE,
            allowNull: true,
          },

          acceptedAt: {
            type: Sequelize.DATE,
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

      await queryInterface.addIndex(
        'organization_invitations',
        ['organizationId'],
        {
          name: 'organization_invitations_organization_id_idx',
          transaction,
        },
      );

      await queryInterface.addIndex('organization_invitations', ['token'], {
        name: 'organization_invitations_token_idx',
        unique: true,
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
      await queryInterface.dropTable('organization_invitations', {
        transaction,
      });
      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },
};
