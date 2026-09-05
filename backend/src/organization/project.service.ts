import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectModel, InjectConnection } from '@nestjs/sequelize';
import { Sequelize, Transaction } from 'sequelize';
import { Project } from '../../models/project.model';
import { ProjectUser } from '../../models/project-user.model';
import { User } from '../../models/user.model';
import { Organization } from '../../models/organization.model';

@Injectable()
export class ProjectService {
  constructor(
    @InjectModel(Project)
    private projectModel: typeof Project,

    @InjectModel(ProjectUser)
    private projectUserModel: typeof ProjectUser,

    @InjectModel(User)
    private userModel: typeof User,

    @InjectModel(Organization)
    private organizationModel: typeof Organization,

    @InjectConnection()
    private sequelize: Sequelize,
  ) {}

  async createProjectWithUsers(input: {
    organizationId: string;
    name: string;
    description?: string;
    status?: string;
    userIds: string[];
  }): Promise<{ project: Project; associatedUsers: string[] }> {
    if (!input.organizationId || !input.name) {
      throw new BadRequestException('organizationId and name are required');
    }

    const organization = await this.organizationModel.findByPk(input.organizationId);
    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    if (input.userIds.length > 0) {
      const count = await this.userModel.count({
        where: { id: input.userIds },
      });
      if (count !== input.userIds.length) {
        throw new BadRequestException('One or more users do not exist');
      }
    }

    const result = await this.sequelize.transaction(async (transaction) => {
      const project = await this.projectModel.create(
        {
          organizationId: input.organizationId,
          name: input.name,
          description: input.description,
          status: input.status || 'active',
        } as any,
        { transaction },
      );

      const associatedUsers: string[] = [];
      for (const userId of input.userIds) {
        await this.projectUserModel.create(
          {
            projectId: project.id,
            userId,
            role: 'member',
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