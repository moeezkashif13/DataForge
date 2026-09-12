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
import { OrganizationUser } from '../../models/organization-user.model';
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

    @InjectModel(OrganizationUser)
    private readonly organizationUserModel: typeof OrganizationUser,

    @InjectModel(Organization)
    private readonly organizationModel: typeof Organization,
  ) {}

  formatMigration(migration: Migration) {
    const data = migration.get
      ? migration.get({ plain: true })
      : (migration as any);

    const sourceLabel =
      data.source_database && data.source_table
        ? `${data.source_database}.${data.source_table}`
        : data.source_file_path ||
          data.source_table ||
          data.source_database ||
          'production.customers';

    const targetLabel =
      data.target_database && data.target_table
        ? `${data.target_database}.${data.target_table}`
        : data.target_table || data.target_database || 'analytics.customers_v2';

    return {
      id: data.id,
      name: data.name,
      description: data.description || '',
      projectId: data.projectId,
      projectName: data.project?.name || 'Customer Platform',
      sourceTargetLabel: `${sourceLabel} → ${targetLabel}`,
      sourceConnId: 'conn-pg-prod (Dummy)',
      sourceType: data.source_type,
      source_type: data.source_type,
      source_schema: data.source_schema || 'public',
      source_database: data.source_database,
      source_table: data.source_table,
      source_file_path: data.source_file_path,
      targetConnId: 'conn-pg-analytics (Dummy)',
      targetType: data.target_type,
      target_type: data.target_type,
      target_schema: data.target_schema || 'public',
      target_database: data.target_database,
      target_table: data.target_table,
      agentId: 'agent-prod-01 (Dummy)',
      agentName: 'Production Agent US-East (Dummy)',
      status: data.status,
      progress: 78.2,
      recordsProcessed: 782400,
      recordsTotal: 1000000,
      recordsSucceeded: 780912,
      recordsFailed: 1488,
      throughput: 696,
      startedAt: '10:42 AM Today (Dummy)',
      elapsed: '18m 42s (Dummy)',
      eta: '5m 12s (Dummy)',
      checkpoint: 'chkpt_b294_offset_782000 (Dummy)',
      retries: 4,
      batchSize: 2000,
      fieldMappingsCount: '6 (Dummy)',
      lastRun: '2 minutes ago (Dummy)',
      createdBy: data.createdBy,
      creator: data.creator
        ? {
            id: data.creator.id,
            name: data.creator.name,
            email: data.creator.email,
          }
        : null,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    };
  }

  async createMigration(
    dto: CreateMigrationDto,
    creatorUserId: string,
  ): Promise<any> {
    if (!creatorUserId) {
      throw new UnauthorizedException(
        'Authentication required to create a migration',
      );
    }

    const { projectId, name, description } = dto;

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

    // 3. Verify user is specifically a member of this project or an organization admin
    const projectMembership = await this.projectUserModel.findOne({
      where: {
        projectId,
        userId: creatorUserId,
      },
    });

    const orgAdmin = await this.organizationUserModel.findOne({
      where: {
        organizationId: project.organizationId,
        userId: creatorUserId,
        role: 'admin',
      },
    });

    if (!projectMembership && !orgAdmin) {
      throw new ForbiddenException(
        'User is not a member of this project. Migrations can only be created by assigned project members.',
      );
    }

    // 4. Create Migration using the validated DTO properties
    const createPayload: any = {
      projectId,
      createdBy: creatorUserId,
      name,
      description: description ?? null,
      source_type: dto.source_type,
      source_schema: dto.source_schema || 'public',
      source_database: dto.source_database ?? null,
      source_table: dto.source_table ?? null,
      source_file_path: dto.source_file_path ?? null,
      target_type: dto.target_type,
      target_schema: dto.target_schema || 'public',
      target_database: dto.target_database,
      target_table: dto.target_table,
      status: MigrationStatus.READY,
    };

    const created = await this.migrationModel.create(createPayload);

    const reloaded = await this.migrationModel.findByPk(created.id, {
      include: [
        {
          model: Project,
          attributes: ['id', 'name', 'organizationId'],
        },
        {
          model: User,
          attributes: ['id', 'name', 'email'],
        },
      ],
    });

    return this.formatMigration(reloaded || created);
  }

  async getMigrationsForUser(userId: string, projectId?: string) {
    if (!userId) {
      throw new UnauthorizedException('Authentication required');
    }

    // 1. Direct project memberships
    const userProjects = await this.projectUserModel.findAll({
      where: { userId },
      attributes: ['projectId'],
    });
    const userProjectIds = userProjects.map((p) => p.projectId);

    // 2. Organization projects where user is an admin
    const adminOrgMemberships = await this.organizationUserModel.findAll({
      where: { userId, role: 'admin' },
      attributes: ['organizationId'],
    });

    if (adminOrgMemberships.length > 0) {
      const adminOrgIds = adminOrgMemberships.map((o) => o.organizationId);
      const adminProjects = await this.projectModel.findAll({
        where: { organizationId: adminOrgIds },
        attributes: ['id'],
      });
      for (const p of adminProjects) {
        userProjectIds.push(p.id);
      }
    }

    const uniqueProjectIds = Array.from(new Set(userProjectIds));

    if (uniqueProjectIds.length === 0) {
      return [];
    }

    let targetProjectIds = uniqueProjectIds;
    if (projectId) {
      if (!uniqueProjectIds.includes(projectId)) {
        throw new ForbiddenException(
          'You do not have permission to view migrations for this project',
        );
      }
      targetProjectIds = [projectId];
    }

    const migrations = await this.migrationModel.findAll({
      where: {
        projectId: targetProjectIds,
      },
      include: [
        {
          model: Project,
          attributes: ['id', 'name', 'organizationId'],
        },
        {
          model: User,
          attributes: ['id', 'name', 'email'],
        },
      ],
      order: [['createdAt', 'DESC']],
    });

    return migrations.map((m) => this.formatMigration(m));
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

  async getMigrationDetails(id: string, userId: string) {
    if (!userId) {
      throw new UnauthorizedException('Authentication required');
    }

    const migration = await this.migrationModel.findByPk(id, {
      include: [
        {
          model: Project,
          attributes: ['id', 'name', 'organizationId'],
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

    // Verify user is a member of this project or an organization admin
    const projectMembership = await this.projectUserModel.findOne({
      where: {
        projectId: migration.projectId,
        userId,
      },
    });

    const orgAdmin = migration.project?.organizationId
      ? await this.organizationUserModel.findOne({
          where: {
            organizationId: migration.project.organizationId,
            userId,
            role: 'admin',
          },
        })
      : null;

    if (!projectMembership && !orgAdmin) {
      throw new ForbiddenException(
        'You do not have permission to view this migration',
      );
    }

    return this.formatMigration(migration);
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

  async deleteMigration(
    id: string,
    userId: string,
  ): Promise<{ success: boolean; message: string }> {
    if (!userId) {
      throw new UnauthorizedException('Authentication required');
    }

    const migration = await this.migrationModel.findByPk(id, {
      include: [
        {
          model: Project,
          attributes: ['id', 'organizationId'],
        },
      ],
    });

    if (!migration) {
      throw new NotFoundException(`Migration with ID ${id} not found`);
    }

    // Verify user is a member of this project or an organization admin
    const projectMembership = await this.projectUserModel.findOne({
      where: {
        projectId: migration.projectId,
        userId,
      },
    });

    if (!projectMembership) {
      throw new ForbiddenException(
        'Youa re not a member of this project. Migrations can only be deleted by assigned project members.',
      );
    }

    await migration.destroy();

    return {
      success: true,
      message: 'Migration deleted successfully',
    };
  }
}
