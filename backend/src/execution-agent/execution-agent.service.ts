import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { JwtService } from '@nestjs/jwt';
import * as crypto from 'crypto';
import { Agent, AgentStatus } from '../../models/agent.model';
import { ConnectionToken } from '../../models/connection-token.model';
import { Organization } from '../../models/organization.model';
import { OrganizationUser } from '../../models/organization-user.model';
import { Project } from '../../models/project.model';
import { ProjectUser } from '../../models/project-user.model';
import { User } from '../../models/user.model';
import { CreateAgentDto } from './dto/create-agent.dto';
import { GenerateConnectionTokenDto } from './dto/generate-token.dto';

@Injectable()
export class ExecutionAgentService {
  constructor(
    @InjectModel(Agent)
    private readonly agentModel: typeof Agent,

    @InjectModel(ConnectionToken)
    private readonly connectionTokenModel: typeof ConnectionToken,

    @InjectModel(Organization)
    private readonly organizationModel: typeof Organization,

    @InjectModel(OrganizationUser)
    private readonly organizationUserModel: typeof OrganizationUser,

    @InjectModel(Project)
    private readonly projectModel: typeof Project,

    @InjectModel(ProjectUser)
    private readonly projectUserModel: typeof ProjectUser,

    private readonly jwtService: JwtService,
  ) {}

  formatAgent(agent: Agent) {
    const data = agent.get ? agent.get({ plain: true }) : (agent as any);

    return {
      id: data.id,
      name: data.name,
      description:
        data.description || 'Customer-hosted execution worker (Dummy)',
      organizationId: data.organizationId,
      organizationName:
        data.organization?.name || 'Customer Organization (Dummy)',
      projectId: data.projectId || null,
      projectName: data.project?.name || null,
      status: data.status,

      version: 'v1.4.2 (Dummy)',
      environment: 'Production (Dummy)',
      host: 'prod-migration-01.internal (Dummy)',
      ip: '10.240.12.84 (Dummy)',
      lastHeartbeat: data.lastHeartbeatAt
        ? 'Just now (Dummy)'
        : '6 seconds ago (Dummy)',
      lastHeartbeatMs: 6000,
      activeMigrations: 0,
      totalCompleted: 0,
      uptime: '99.98% (Dummy)',
      cpuUsage: '18% (Dummy)',
      memUsage: '1.4 GB / 8 GB (Dummy)',
      networkEgress: '48.2 MB/s (Dummy)',
      dockerImage: 'dataforge/migration-agent:v1.4.2 (Dummy)',
      registeredAt: data.createdAt,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
      createdBy: data.createdBy,
      creator: data.creator
        ? {
            id: data.creator.id,
            name: data.creator.name,
            email: data.creator.email,
          }
        : null,
    };
  }

  async createAgent(dto: CreateAgentDto, creatorUserId: string): Promise<any> {
    let { projectId, organizationId, name, description } = dto;

    if (!projectId) {
      throw new BadRequestException(
        'Project ID is required to register an execution agent',
      );
    }

    const project = await this.projectModel.findByPk(projectId);
    if (!project) {
      throw new NotFoundException(`Project with ID ${projectId} not found`);
    }

    const projectMembership = await this.projectUserModel.findOne({
      where: {
        projectId,
        userId: creatorUserId,
      },
    });

    if (!projectMembership) {
      throw new ForbiddenException(
        'You are not a member of this project and cannot add agents to it',
      );
    }

    // Automatically resolve organizationId from the project
    const resolvedOrgId = project.organizationId || organizationId;

    const existingAgent = await this.agentModel.findOne({
      where: {
        projectId,
        name: name.trim(),
      },
    });

    if (existingAgent) {
      throw new ConflictException(
        `An agent with the name "${name.trim()}" already exists in this project`,
      );
    }

    const created = await this.agentModel.create({
      organizationId: resolvedOrgId,
      projectId,
      createdBy: creatorUserId,
      name: name.trim(),
      description: description ? description.trim() : null,
      status: AgentStatus.ACTIVE,
    } as any);

    const reloaded = await this.agentModel.findByPk(created.id, {
      include: [
        {
          model: Organization,
          attributes: ['id', 'name'],
        },
        {
          model: Project,
          attributes: ['id', 'name'],
        },
        {
          model: User,
          attributes: ['id', 'name', 'email'],
        },
      ],
    });

    return this.formatAgent(reloaded || created);
  }

  async getAgentsForUser(
    userId: string,
    organizationId?: string,
    projectId?: string,
  ): Promise<any[]> {
    if (!userId) {
      throw new UnauthorizedException('Authentication required');
    }

    // Find all projects where the user is an assigned member
    const userProjects = await this.projectUserModel.findAll({
      where: { userId },
      attributes: ['projectId'],
    });

    if (!userProjects.length) {
      return [];
    }

    const userProjectIds = userProjects.map((p) => p.projectId);

    let targetProjectIds: string[] = [];
    if (projectId) {
      if (!userProjectIds.includes(projectId)) {
        throw new ForbiddenException('You do not have access to this project');
      }
      targetProjectIds = [projectId];
    } else {
      targetProjectIds = userProjectIds;
    }

    const whereClause: any = {
      projectId: targetProjectIds,
    };

    if (organizationId) {
      const membership = await this.organizationUserModel.findOne({
        where: { organizationId, userId },
      });

      if (!membership) {
        throw new ForbiddenException(
          'You are not a member of this organization',
        );
      }
      whereClause.organizationId = organizationId;
    }

    const agents = await this.agentModel.findAll({
      where: whereClause,
      include: [
        {
          model: Organization,
          attributes: ['id', 'name'],
        },
        {
          model: Project,
          attributes: ['id', 'name'],
        },
        {
          model: User,
          attributes: ['id', 'name', 'email'],
        },
      ],
      order: [['createdAt', 'DESC']],
    });

    return agents.map((agent) => this.formatAgent(agent));
  }

  async generateConnectionToken(
    agentId: string,
    dto: GenerateConnectionTokenDto,
    userId: string,
  ): Promise<{
    agentId: string;
    token: string;
    expiresAt: Date | null;
    createdAt: Date;
    message: string;
  }> {
    const agent = await this.agentModel.findByPk(agentId);
    if (!agent) {
      throw new NotFoundException(`Not found`);
    }

    if (agent.projectId) {
      const projectMembership = await this.projectUserModel.findOne({
        where: {
          projectId: agent.projectId,
          userId,
        },
      });

      if (!projectMembership) {
        throw new ForbiddenException('You do not have access to this agent');
      }
    } else {
      const orgMembership = await this.organizationUserModel.findOne({
        where: {
          organizationId: agent.organizationId,
          userId,
        },
      });

      if (!orgMembership) {
        throw new ForbiddenException('You do not have access to this agent');
      }
    }

    const randomHex = crypto.randomBytes(32).toString('hex');
    const plainToken = `df_agent_${randomHex}`;

    const hashedToken = crypto
      .createHash('sha256')
      .update(plainToken)
      .digest('hex');

    let expiresAt = new Date(Date.now() + 1 * 24 * 60 * 60 * 1000);

    const connectionTokenRecord = await this.connectionTokenModel.create({
      agentId,
      token: hashedToken,
      expiresAt,
      isRevoked: false,
    } as any);

    return {
      agentId,
      token: plainToken,
      expiresAt,
      createdAt: connectionTokenRecord.createdAt,
      message:
        'Store this token safely. It will not be shown again for security reasons.',
    };
  }

  async getAgentById(agentId: string, userId: string) {
    const agent = await this.agentModel.findByPk(agentId, {
      include: [
        {
          model: Organization,
          attributes: ['id', 'name'],
        },
        {
          model: Project,
          attributes: ['id', 'name'],
        },
        {
          model: User,
          attributes: ['id', 'name', 'email'],
        },
      ],
    });

    if (!agent) {
      throw new NotFoundException(`Agent with ID ${agentId} not found`);
    }

    if (agent.projectId) {
      const projectMembership = await this.projectUserModel.findOne({
        where: {
          projectId: agent.projectId,
          userId,
        },
      });

      if (!projectMembership) {
        throw new ForbiddenException('You do not have access to this agent');
      }
    } else {
      const orgMembership = await this.organizationUserModel.findOne({
        where: {
          organizationId: agent.organizationId,
          userId,
        },
      });

      if (!orgMembership) {
        throw new ForbiddenException('You do not have access to this agent');
      }
    }

    return this.formatAgent(agent);
  }

  async verifyConnectionToken(token: string): Promise<{
    accessToken: string;
    agentId: string;
    organizationId: string;
    projectId: string | null;
  }> {
    if (!token || typeof token !== 'string' || !token.trim()) {
      throw new UnauthorizedException('Connection token is required');
    }

    const trimmedToken = token.trim();
    const hashedToken = crypto
      .createHash('sha256')
      .update(trimmedToken)
      .digest('hex');

    const connectionTokenRecord = await this.connectionTokenModel.findOne({
      where: {
        token: hashedToken,
      },
      include: [
        {
          model: Agent,
          include: [
            {
              model: Project,
              attributes: ['id', 'name'],
            },
          ],
        },
      ],
    });

    if (!connectionTokenRecord) {
      throw new UnauthorizedException('Invalid connection token');
    }

    if (connectionTokenRecord.isRevoked) {
      throw new UnauthorizedException('Connection token has been revoked');
    }

    if (
      connectionTokenRecord.expiresAt &&
      new Date(connectionTokenRecord.expiresAt) < new Date()
    ) {
      throw new UnauthorizedException('Connection token has expired');
    }

    const agent = connectionTokenRecord.agent;
    if (!agent) {
      throw new UnauthorizedException('Associated agent not found');
    }

    if (agent.status === AgentStatus.INACTIVE) {
      throw new UnauthorizedException('Agent is inactive');
    }

    // Single-use enrollment: revoke immediately after first successful verification
    connectionTokenRecord.isRevoked = true;
    connectionTokenRecord.lastUsedAt = new Date();
    await connectionTokenRecord.save();

    agent.lastHeartbeatAt = new Date();
    agent.status = AgentStatus.CONNECTED;
    await agent.save();

    const secret =
      process.env.DEFAULT_JWT_SECRET ||
      process.env.JWT_SECRET ||
      process.env.AUTH_SECRET ||
      'dataforge-agent-secret-key';

    const jwtToken = this.jwtService.sign(
      {
        agent_id: agent.id,
        organization_id: agent.organizationId,
        project_id: agent.projectId,
        type: 'ea_token',
      },
      {
        secret,
        expiresIn: (process.env.DEFAULT_JWT_EXPIRES_IN || '1d') as any,
      },
    );

    return {
      accessToken: jwtToken,
      agentId: agent.id,
      organizationId: agent.organizationId,
      projectId: agent.projectId || null,
    };
  }

  async deleteAgent(
    agentId: string,
    userId: string,
  ): Promise<{ success: boolean; message: string }> {
    const agent = await this.agentModel.findByPk(agentId);
    if (!agent) {
      throw new NotFoundException(`Agent with ID ${agentId} not found`);
    }

    const projectMembership = await this.projectUserModel.findOne({
      where: {
        projectId: agent.projectId,
        userId,
      },
    });

    if (!projectMembership) {
      throw new ForbiddenException(
        'You do not have permission to delete this agent',
      );
    }

    await agent.destroy();

    return {
      success: true,
      message: 'Execution agent and related tokens deleted successfully',
    };
  }
}
