'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      // 1. Composite index for migrations query: project_id + "createdAt" DESC
      await queryInterface.addIndex(
        'migrations',
        ['project_id', { name: 'createdAt', order: 'DESC' }],
        {
          name: 'idx_migrations_project_created',
          transaction,
        },
      );

      // 2. Composite index for organization_users query: "userId" + "role"
      await queryInterface.addIndex(
        'organization_users',
        ['userId', 'role'],
        {
          name: 'idx_organization_users_user_role',
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
      await queryInterface.removeIndex(
        'migrations',
        'idx_migrations_project_created',
        { transaction },
      );
      await queryInterface.removeIndex(
        'organization_users',
        'idx_organization_users_user_role',
        { transaction },
      );
      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },
};
