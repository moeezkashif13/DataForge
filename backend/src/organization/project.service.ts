import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { InjectModel, InjectConnection } from '@nestjs/sequelize';
import { Sequelize } from 'sequelize';
import { Project } from '../../models/project.model';
import { ProjectUser } from '../../models/project-user.model';
import { User } from '../../models/user.model';
import { Organization } from '../../models/organization.model';
import { OrganizationUser } from '../../models/organization-user.model';
import { Migration } from '../../models/migration.model';
import { CreateProjectDto } from './dto/create-project.dto';

@Injectable()
export class ProjectService {
  constructor(
    @InjectModel(Project)
    private readonly projectModel: typeof Project,

    @InjectModel(ProjectUser)
    private readonly projectUserModel: typeof ProjectUser,

    @InjectModel(User)
    private readonly userModel: typeof User,

    @InjectModel(Organization)
    private readonly organizationModel: typeof Organization,

    @InjectModel(OrganizationUser)
    private readonly organizationUserModel: typeof OrganizationUser,

    @InjectConnection()
    private readonly sequelize: Sequelize,
  ) {}

  async createProjectWithUsers(
    dto: CreateProjectDto,
    creatorUserId: string,
  ): Promise<{ project: Project; associatedUsers: string[] }> {
    const { organizationId, name, description, userIds } = dto;

    const organization = await this.organizationModel.findByPk(organizationId);
    if (!organization) {
      throw new NotFoundException(`Invalid operation`);
    }

    // Check unique project name per organization
    const existingProject = await this.projectModel.findOne({
      where: {
        organizationId,
        name: name.trim(),
      },
    });

    if (existingProject) {
      throw new ConflictException(
        `A project with this name already exists in this organization`,
      );
    }

    const allCandidateUserIds = Array.from(
      new Set([creatorUserId, ...(userIds || [])]),
    );

    const orgUserRecords = await this.organizationUserModel.findAll({
      where: {
        organizationId,
        userId: allCandidateUserIds,
      },
      attributes: ['userId'],
    });

    const foundOrgUserIds = new Set(
      orgUserRecords.map((record) => record.userId),
    );
    const nonOrgUserIds = allCandidateUserIds.filter(
      (id) => !foundOrgUserIds.has(id),
    );

    if (nonOrgUserIds.length > 0) {
      if (nonOrgUserIds.includes(creatorUserId)) {
        throw new ForbiddenException(
          // 'You are not a member of this organization and cannot create projects in it',
          'Invalid operation',
        );
      }
      throw new BadRequestException(
        // `The following users are not members of organization ${organizationId}: ${nonOrgUserIds.join(
        //   ', ',
        // )}`,
        'Invalid operation',
      );
    }

    // 4. Perform database write operations within a transaction
    const result = await this.sequelize.transaction(async (transaction) => {
      const project = await this.projectModel.create(
        {
          organizationId,
          name: name.trim(),
          description: description ? description.trim() : null,
          status: 'active', // default active, never taken from payload
        } as any,
        { transaction },
      );

      const associatedUsers: string[] = [];

      for (const userId of allCandidateUserIds) {
        await this.projectUserModel.create(
          {
            projectId: project.id,
            userId,
            role: userId === creatorUserId ? 'creator' : 'member',
          } as any,
          { transaction },
        );
        associatedUsers.push(userId);
      }

      return { project, associatedUsers };
    });

    return result;
  }

  async getProjectsForUserOrganization(
    userId: string,
    requestedOrgId?: string,
  ) {
    if (!userId) {
      throw new UnauthorizedException('Authentication required');
    }

    let targetOrganizationId = requestedOrgId;

    if (targetOrganizationId) {
      const membership = await this.organizationUserModel.findOne({
        where: {
          userId,
          organizationId: targetOrganizationId,
        },
      });

      if (!membership) {
        throw new ForbiddenException(
          'You are not a member of this organization',
        );
      }
    } else {
      const userOrgs = await this.organizationUserModel.findAll({
        where: { userId },
        order: [['createdAt', 'ASC']],
      });

      if (!userOrgs.length) {
        return { organizationId: null, projects: [] };
      }

      targetOrganizationId = userOrgs[0].organizationId;
    }

    const projects = await this.projectModel.findAll({
      where: {
        organizationId: targetOrganizationId,
      },
      order: [['createdAt', 'DESC']],
      include: [
        {
          model: Migration,
          attributes: ['id'],
          required: false,
        },
      ],
    });

    const mappedProjects = projects.map((p) => {
      const data = p.get({ plain: true });
      const migrationCount = Array.isArray(data.migrations)
        ? data.migrations.length
        : 0;

      return {
        id: data.id,
        name: data.name,
        slug:
          data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') ||
          'project-slug (Dummy)',
        description: data.description || 'Project description (Dummy)',
        organizationId: data.organizationId,
        status: (data.status || 'active').toUpperCase(),
        environment: 'Production (Dummy)',
        migrationCount,
        agentCount: '1 (Dummy)',
        lastActivity: 'Just now (Dummy)',
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
      };
    });

    return {
      organizationId: targetOrganizationId,
      projects: mappedProjects,
    };
  }

  async getProjectDetails(projectId: string, userId: string) {
    if (!userId) {
      throw new UnauthorizedException('Authentication required');
    }

    const project = await this.projectModel.findByPk(projectId, {
      include: [
        {
          model: Organization,
          attributes: ['id', 'name'],
        },
        {
          model: Migration,
          required: false,
        },
        {
          model: ProjectUser,
          include: [
            {
              model: User,
              attributes: ['id', 'name', 'email'],
            },
          ],
          required: false,
        },
      ],
    });

    if (!project) {
      throw new NotFoundException(`Project with ID ${projectId} not found`);
    }

    const orgMembership = await this.organizationUserModel.findOne({
      where: {
        userId,
        organizationId: project.organizationId,
      },
    });

    const projectMembership = await this.projectUserModel.findOne({
      where: {
        projectId,
        userId,
      },
    });

    if (!orgMembership && !projectMembership) {
      throw new ForbiddenException(
        'You do not have permission to view this project',
      );
    }

    const data = project.get({ plain: true });
    const migrationsList = Array.isArray(data.migrations)
      ? data.migrations.map((m: any) => {
          const sourceLabel = m.source_path || 'production.customers (Dummy)';
          const targetLabel = m.target_path || 'analytics.customers_v2 (Dummy)';
          return {
            id: m.id,
            name: m.name || 'Customer Records Sync (Dummy)',
            description:
              m.description || 'Customer records sync pipeline (Dummy)',
            status: (m.status || 'RUNNING').toUpperCase(),
            source_path: m.source_path,
            target_path: m.target_path,
            sourceTargetLabel: `${sourceLabel} → ${targetLabel}`,
            progress: 78.2,
            createdAt: m.createdAt,
            updatedAt: m.updatedAt,
          };
        })
      : [];

    return {
      id: data.id,
      name: data.name,
      slug:
        data.name?.toLowerCase().replace(/[^a-z0-9]+/g, '-') ||
        'project-slug (Dummy)',
      description: data.description || 'Project description (Dummy)',
      organizationId: data.organizationId,
      organizationName:
        data.organization?.name || 'Primary Organization (Dummy)',
      status: (data.status || 'active').toUpperCase(),
      environment: 'Production (Dummy)',
      boundary: 'Customer VPC Strict (Dummy)',
      migrationCount: migrationsList.length,
      agentCount: '1 (Dummy)',
      migrations: migrationsList,

      users: Array.isArray(data.projectUsers)
        ? data.projectUsers.map((pu: any) => ({
            id: pu.id,
            userId: pu.userId,
            role: pu.role || 'member',
            name: pu.user?.name || 'Team Member (Dummy)',
            email: pu.user?.email || 'member@example.com (Dummy)',
            joinedAt: pu.createdAt,
          }))
        : [],

      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    };
  }

  async deleteProject(
    projectId: string,
    userId: string,
  ): Promise<{ success: boolean; message: string }> {
    if (!userId) {
      throw new UnauthorizedException('Authentication required');
    }

    const project = await this.projectModel.findByPk(projectId);

    if (!project) {
      throw new NotFoundException(`Project with ID ${projectId} not found`);
    }

    const projectMembership = await this.projectUserModel.findOne({
      where: {
        projectId,
        userId,
      },
    });

    const orgMembership = await this.organizationUserModel.findOne({
      where: {
        organizationId: project.organizationId,
        userId,
      },
    });

    if (!projectMembership && !orgMembership) {
      throw new ForbiddenException(
        'You do not have permission to delete this project',
      );
    }

    await project.destroy();

    return {
      success: true,
      message: 'Project deleted successfully',
    };
  }
}
