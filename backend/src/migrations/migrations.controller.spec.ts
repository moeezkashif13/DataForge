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
        source_path: 's3://source',
        target_path: 's3://dest',
        status: MigrationStatus.ACTIVE,
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
});
