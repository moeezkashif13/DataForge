'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      // 1. Ensure organization_users.id is a formal PRIMARY KEY if not already
      await queryInterface.sequelize.query(
        `DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM pg_constraint WHERE conrelid = 'organization_users'::regclass AND contype = 'p'
          ) THEN
            ALTER TABLE organization_users ADD PRIMARY KEY (id);
          END IF;
        END $$;`,
        { transaction },
      );

      // 2. Create organization_user_permissions junction table
      await queryInterface.createTable(
        'organization_user_permissions',
        {
          id: {
            type: Sequelize.UUID,
            defaultValue: Sequelize.literal('gen_random_uuid()'),
            primaryKey: true,
            allowNull: false,
          },
          organization_user_id: {
            type: Sequelize.UUID,
            allowNull: false,
            references: {
              model: 'organization_users',
              key: 'id',
            },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE',
          },
          permission_id: {
            type: Sequelize.UUID,
            allowNull: false,
            references: {
              model: 'permissions',
              key: 'id',
            },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE',
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

      // Enforce that one user in one org cannot be assigned the same permission twice
      await queryInterface.addIndex(
        'organization_user_permissions',
        ['organization_user_id', 'permission_id'],
        {
          name: 'org_user_permissions_unique_idx',
          unique: true,
          transaction,
        },
      );

      // Fast index for checking permissions by user/org
      await queryInterface.addIndex(
        'organization_user_permissions',
        ['organization_user_id'],
        {
          name: 'org_user_permissions_user_idx',
          transaction,
        },
      );

      // Fast index for reverse lookups (e.g. who has this permission)
      await queryInterface.addIndex(
        'organization_user_permissions',
        ['permission_id'],
        {
          name: 'org_user_permissions_perm_idx',
          transaction,
        },
      );

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  async down(queryInterface) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      await queryInterface.dropTable('organization_user_permissions', {
        transaction,
      });
      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },
};
