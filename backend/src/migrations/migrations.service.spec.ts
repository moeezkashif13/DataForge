import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/sequelize';
import {
  UnauthorizedException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { MigrationsService } from './migrations.service';
import { Migration, MigrationStatus } from '../../models/migration.model';
import { Project } from '../../models/project.model';
import { ProjectUser } from '../../models/project-user.model';
import { User } from '../../models/user.model';
import { CreateMigrationDto } from './dto/create-migration.dto';

describe('MigrationsService', () => {
  let service: MigrationsService;
  let mockMigrationModel: any;
  let mockProjectModel: any;
  let mockProjectUserModel: any;
  let mockUserModel: any;

  beforeEach(async () => {
    mockMigrationModel = {
      create: jest.fn(),
      findByPk: jest.fn(),
      findAll: jest.fn(),
    };

    mockProjectModel = {
      findByPk: jest.fn(),
    };

    mockProjectUserModel = {
      findOne: jest.fn(),
    };

    mockUserModel = {
      findByPk: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MigrationsService,
        {
          provide: getModelToken(Migration),
          useValue: mockMigrationModel,
        },
        {
          provide: getModelToken(Project),
          useValue: mockProjectModel,
        },
        {
          provide: getModelToken(ProjectUser),
          useValue: mockProjectUserModel,
        },
        {
          provide: getModelToken(User),
          useValue: mockUserModel,
        },
      ],
    }).compile();

    service = module.get<MigrationsService>(MigrationsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createMigration', () => {
    const validDto: CreateMigrationDto = {
      projectId: 'proj-123',
      name: 'User Database Migration',
      description: 'Migrating legacy db to new Postgres schema',
      source_path: 's3://old-bucket/dump.sql',
      target_path: 's3://new-bucket/target/',
      status: MigrationStatus.ACTIVE,
    };

    it('should successfully create a migration if user is an assigned project member', async () => {
      mockProjectModel.findByPk.mockResolvedValue({ id: 'proj-123', name: 'Alpha Project' });
      mockUserModel.findByPk.mockResolvedValue({ id: 'user-123', name: 'Alice' });
      mockProjectUserModel.findOne.mockResolvedValue({
        projectId: 'proj-123',
        userId: 'user-123',
        role: 'member',
      });
      mockMigrationModel.create.mockImplementation((data: any) =>
        Promise.resolve({ id: 'mig-001', ...data }),
      );

      const result = await service.createMigration(validDto, 'user-123');

      expect(mockProjectModel.findByPk).toHaveBeenCalledWith('proj-123', expect.any(Object));
      expect(mockUserModel.findByPk).toHaveBeenCalledWith('user-123');
      expect(mockProjectUserModel.findOne).toHaveBeenCalledWith({
        where: { projectId: 'proj-123', userId: 'user-123' },
      });
      expect(mockMigrationModel.create).toHaveBeenCalledWith({
        projectId: 'proj-123',
        createdBy: 'user-123',
        name: 'User Database Migration',
        description: 'Migrating legacy db to new Postgres schema',
        source_path: 's3://old-bucket/dump.sql',
        target_path: 's3://new-bucket/target/',
        status: MigrationStatus.ACTIVE,
      });
      expect(result.id).toBe('mig-001');
    });

    it('should reject with ForbiddenException if user is NOT a member of the project', async () => {
      mockProjectModel.findByPk.mockResolvedValue({ id: 'proj-123', name: 'Alpha Project' });
      mockUserModel.findByPk.mockResolvedValue({ id: 'user-org-only', name: 'Bob' });
      mockProjectUserModel.findOne.mockResolvedValue(null);

      await expect(
        service.createMigration(validDto, 'user-org-only'),
      ).rejects.toThrow(ForbiddenException);

      expect(mockMigrationModel.create).not.toHaveBeenCalled();
    });

    it('should reject with NotFoundException if project does not exist', async () => {
      mockProjectModel.findByPk.mockResolvedValue(null);

      await expect(
        service.createMigration(validDto, 'user-123'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should reject with NotFoundException if user does not exist', async () => {
      mockProjectModel.findByPk.mockResolvedValue({ id: 'proj-123' });
      mockUserModel.findByPk.mockResolvedValue(null);

      await expect(
        service.createMigration(validDto, 'user-nonexistent'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw UnauthorizedException if creator user ID is not provided', async () => {
      await expect(
        service.createMigration(validDto, ''),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('getMigrationById', () => {
    it('should return migration by id', async () => {
      const mockMig = { id: 'mig-001', name: 'Migration 1' };
      mockMigrationModel.findByPk.mockResolvedValue(mockMig);

      const result = await service.getMigrationById('mig-001');
      expect(result).toEqual(mockMig);
    });

    it('should throw NotFoundException if migration does not exist', async () => {
      mockMigrationModel.findByPk.mockResolvedValue(null);

      await expect(service.getMigrationById('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
