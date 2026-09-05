import {
  Injectable,
  UnauthorizedException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Migration, MigrationStatus } from '../../models/migration.model';
import { Project } from '../../models/project.model';
import { ProjectUser } from '../../models/project-user.model';
import { User } from '../../models/user.model';
import { Organization } from '../../models/organization.model';
import { CreateMigrationDto } from './dto/create-migration.dto';

@Injectable()
export class MigrationsService {
  constructor(
    @InjectModel(Migration)
    private readonly migrationModel: typeof Migration,

    @InjectModel(Project)
    private readonly projectModel: typeof Project,

    @InjectModel(ProjectUser)
    private readonly projectUserModel: typeof ProjectUser,

    @InjectModel(User)
    private readonly userModel: typeof User,
  ) {}

  async createMigration(
    dto: CreateMigrationDto,
    creatorUserId: string,
  ): Promise<Migration> {
    if (!creatorUserId) {
      throw new UnauthorizedException(
        'Authentication required to create a migration',
      );
    }

    const { projectId, name, description, source_path, target_path } = dto;

    // 1. Verify target project exists
    const project = await this.projectModel.findByPk(projectId, {
      include: [
        {
          model: Organization,
          attributes: ['id', 'name'],
        },
      ],
    });

    if (!project) {
      throw new NotFoundException(`Project with ID ${projectId} not found`);
    }

    // 2. Verify creator user exists
    const user = await this.userModel.findByPk(creatorUserId);
    if (!user) {
      throw new NotFoundException(`User with ID ${creatorUserId} not found`);
    }

    // 3. Verify user is specifically a member of this project
    const projectMembership = await this.projectUserModel.findOne({
      where: {
        projectId,
        userId: creatorUserId,
      },
    });

    if (!projectMembership) {
      throw new ForbiddenException(
        'User is not a member of this project. Migrations can only be created by assigned project members.',
      );
    }

    // 4. Create Migration using the validated DTO properties
    return this.migrationModel.create({
      projectId,
      createdBy: creatorUserId,
      name,
      description: description ?? null,
      source_path,
      target_path,
      status: MigrationStatus.ACTIVE,
    } as any);
  }

  async getMigrationById(id: string): Promise<Migration> {
    const migration = await this.migrationModel.findByPk(id, {
      include: [
        {
          model: Project,
          include: [Organization],
        },
        {
          model: User,
          attributes: ['id', 'name', 'email'],
        },
      ],
    });

    if (!migration) {
      throw new NotFoundException(`Migration with ID ${id} not found`);
    }

    return migration;
  }

  async getMigrationsByProject(projectId: string): Promise<Migration[]> {
    return this.migrationModel.findAll({
      where: { projectId },
      include: [
        {
          model: User,
          attributes: ['id', 'name', 'email'],
        },
      ],
      order: [['createdAt', 'DESC']],
    });
  }
}
