'use strict';

const INITIAL_PERMISSIONS = [
  {
    name: 'project:create',
    description: 'Can create projects',
  },
  {
    name: 'project:read',
    description: 'Can view projects',
  },
  {
    name: 'project:update',
    description: 'Can update projects',
  },
  {
    name: 'project:delete',
    description: 'Can delete projects',
  },
  {
    name: 'agent:create',
    description: 'Can create execution agents',
  },
  {
    name: 'agent:read',
    description: 'Can view execution agents',
  },
  {
    name: 'agent:update',
    description: 'Can update execution agents',
  },
  {
    name: 'agent:delete',
    description: 'Can delete execution agents',
  },
];

module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      const records = INITIAL_PERMISSIONS.map((p) => ({
        id: Sequelize.literal('gen_random_uuid()'),
        name: p.name,
        description: p.description,
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

      await queryInterface.bulkInsert('permissions', records, {
        transaction,
        ignoreDuplicates: true,
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
      const names = INITIAL_PERMISSIONS.map((p) => p.name);
      await queryInterface.bulkDelete(
        'permissions',
        {
          name: {
            [Sequelize.Op.in]: names,
          },
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
