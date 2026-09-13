'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      // 1. Add project_id column (allowNull: true initially to safely handle existing rows)
      await queryInterface.addColumn(
        'agents',
        'project_id',
        {
          type: Sequelize.UUID,
          allowNull: true,
          references: {
            model: 'projects',
            key: 'id',
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        { transaction },
      );

      // 2. Backfill project_id for any existing agents using a project from their organization
      await queryInterface.sequelize.query(
        `UPDATE agents a
         SET project_id = (
           SELECT p.id 
           FROM projects p 
           WHERE p."organizationId" = a.organization_id 
           ORDER BY p."createdAt" ASC 
           LIMIT 1
         )
         WHERE a.project_id IS NULL;`,
        { transaction },
      );

      // 3. Remove old unique constraint on (organization_id, name) if it exists
      try {
        await queryInterface.removeConstraint(
          'agents',
          'agents_organization_id_name_unique',
          { transaction },
        );
      } catch (err) {
        // May not exist or have a different name in some environments
      }

      // 4. Add index on project_id
      await queryInterface.addIndex('agents', ['project_id'], {
        name: 'agents_project_id_idx',
        transaction,
      });

      // 5. Add unique constraint on (project_id, name)
      await queryInterface.addConstraint('agents', {
        fields: ['project_id', 'name'],
        type: 'unique',
        name: 'agents_project_id_name_unique',
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
      try {
        await queryInterface.removeConstraint(
          'agents',
          'agents_project_id_name_unique',
          { transaction },
        );
      } catch (err) {}

      try {
        await queryInterface.removeIndex('agents', 'agents_project_id_idx', {
          transaction,
        });
      } catch (err) {}

      try {
        await queryInterface.addConstraint('agents', {
          fields: ['organization_id', 'name'],
          type: 'unique',
          name: 'agents_organization_id_name_unique',
          transaction,
        });
      } catch (err) {}

      await queryInterface.removeColumn('agents', 'project_id', {
        transaction,
      });

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },
};
