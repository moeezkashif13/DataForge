'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      // 1. Create 'agents' table
      await queryInterface.createTable(
        'agents',
        {
          id: {
            type: Sequelize.UUID,
            defaultValue: Sequelize.literal('gen_random_uuid()'),
            primaryKey: true,
            allowNull: false,
          },

          organization_id: {
            type: Sequelize.UUID,
            allowNull: false,
            references: {
              model: 'organizations',
              key: 'id',
            },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE',
          },

          name: {
            type: Sequelize.STRING(255),
            allowNull: false,
          },

          description: {
            type: Sequelize.TEXT,
            allowNull: true,
          },

          status: {
            type: Sequelize.STRING(50),
            allowNull: false,
            defaultValue: 'active',
          },

          last_heartbeat_at: {
            type: Sequelize.DATE,
            allowNull: true,
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

      // Add unique constraint per organization
      await queryInterface.addConstraint('agents', {
        fields: ['organization_id', 'name'],
        type: 'unique',
        name: 'agents_organization_id_name_unique',
        transaction,
      });

      await queryInterface.addIndex('agents', ['organization_id'], {
        name: 'agents_organization_id_idx',
        transaction,
      });

      await queryInterface.addIndex('agents', ['created_by'], {
        name: 'agents_created_by_idx',
        transaction,
      });

      // 2. Create 'connection_tokens' table
      await queryInterface.createTable(
        'connection_tokens',
        {
          id: {
            type: Sequelize.UUID,
            defaultValue: Sequelize.literal('gen_random_uuid()'),
            primaryKey: true,
            allowNull: false,
          },

          agent_id: {
            type: Sequelize.UUID,
            allowNull: false,
            references: {
              model: 'agents',
              key: 'id',
            },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE',
          },

          token: {
            type: Sequelize.STRING(255),
            allowNull: false,
          },

          expires_at: {
            type: Sequelize.DATE,
            allowNull: true,
          },

          last_used_at: {
            type: Sequelize.DATE,
            allowNull: true,
          },

          is_revoked: {
            type: Sequelize.BOOLEAN,
            allowNull: false,
            defaultValue: false,
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

      await queryInterface.addIndex('connection_tokens', ['agent_id'], {
        name: 'connection_tokens_agent_id_idx',
        transaction,
      });

      await queryInterface.addIndex('connection_tokens', ['token'], {
        name: 'connection_tokens_token_idx',
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
      await queryInterface.dropTable('connection_tokens', { transaction });
      await queryInterface.dropTable('agents', { transaction });
      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },
};
