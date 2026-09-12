import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus } from '@nestjs/common';
import { MigrationsController } from './migrations.controller';
import { MigrationsService } from './migrations.service';
import { MigrationStatus } from '../../models/migration.model';

describe('MigrationsController', () => {
  let controller: MigrationsController;
  let mockMigrationsService: any;

  beforeEach(async () => {
    mockMigrationsService = {
      createMigration: jest.fn(),
      deleteMigration: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [MigrationsController],
      providers: [
        {
          provide: MigrationsService,
          useValue: mockMigrationsService,
        },
      ],
    }).compile();

    controller = module.get<MigrationsController>(MigrationsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a migration and return 201 status response', async () => {
      const dto = {
        projectId: 'proj-123',
        name: 'Migration A',
        status: MigrationStatus.READY,
      };
      const user = { id: 'user-123' };
      const createdMigration = { id: 'mig-1', ...dto, createdBy: user.id };

      mockMigrationsService.createMigration.mockResolvedValue(createdMigration);

      const response = await controller.create(dto, user);

      expect(mockMigrationsService.createMigration).toHaveBeenCalledWith(
        dto,
        user.id,
      );
      expect(response).toEqual({
        statusCode: HttpStatus.CREATED,
        message: 'Migration created successfully',
        data: createdMigration,
      });
    });
  });

  describe('deleteMigration', () => {
    it('should delete a migration and return 200 status response', async () => {
      const user = { id: 'user-123' };
      const deleteResult = {
        success: true,
        message: 'Migration deleted successfully',
      };

      mockMigrationsService.deleteMigration.mockResolvedValue(deleteResult);

      const response = await controller.deleteMigration('mig-1', user);

      expect(mockMigrationsService.deleteMigration).toHaveBeenCalledWith(
        'mig-1',
        user.id,
      );
      expect(response).toEqual({
        statusCode: HttpStatus.OK,
        message: 'Migration deleted successfully',
        data: deleteResult,
      });
    });

    it('should throw UnauthorizedException if user is not authenticated', async () => {
      await expect(controller.deleteMigration('mig-1', null)).rejects.toThrow();
    });
  });
});
