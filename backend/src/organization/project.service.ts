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
}
