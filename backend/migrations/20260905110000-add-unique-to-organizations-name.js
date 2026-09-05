'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addConstraint('organizations', {
      fields: ['name'],
      type: 'unique',
      name: 'organizations_name_unique',
    });
  },

  async down(queryInterface) {
    await queryInterface.removeConstraint('organizations', 'organizations_name_unique');
  },
};
