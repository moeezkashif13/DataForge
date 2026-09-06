import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import * as crypto from 'crypto';
import { Agent, AgentStatus } from '../../models/agent.model';
import { ConnectionToken } from '../../models/connection-token.model';
import { Organization } from '../../models/organization.model';
import { OrganizationUser } from '../../models/organization-user.model';
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
  ) {}

  async createAgent(
    dto: CreateAgentDto,
    creatorUserId: string,
  ): Promise<Agent> {
    if (!creatorUserId) {
      throw new UnauthorizedException(
        'Authentication required to create an agent',
      );
    }

    const { organizationId, name, description } = dto;

    const organization = await this.organizationModel.findByPk(organizationId);
    if (!organization) {
      throw new NotFoundException(
        `Organization with ID ${organizationId} not found`,
      );
    }

    const orgMembership = await this.organizationUserModel.findOne({
      where: {
        organizationId,
        userId: creatorUserId,
      },
    });

    if (!orgMembership) {
      throw new ForbiddenException(
        'You are not a member of this organization and cannot create agents for it',
      );
    }

    const existingAgent = await this.agentModel.findOne({
      where: {
        organizationId,
        name: name.trim(),
      },
    });

    if (existingAgent) {
      throw new ConflictException(`An agent with the name already exists`);
    }

    return this.agentModel.create({
      organizationId,
      createdBy: creatorUserId,
      name: name.trim(),
      description: description ? description.trim() : null,
      status: AgentStatus.ACTIVE,
    } as any);
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

    const orgMembership = await this.organizationUserModel.findOne({
      where: {
        organizationId: agent.organizationId,
        userId,
      },
    });

    if (!orgMembership) {
      throw new ForbiddenException('You do not have access to this agent');
    }

    const randomHex = crypto.randomBytes(32).toString('hex');
    const plainToken = `df_agent_${randomHex}`;

    const hashedToken = crypto
      .createHash('sha256')
      .update(plainToken)
      .digest('hex');

    // let expiresAt: Date | null = null;
    // if (dto?.expiresInDays && dto.expiresInDays > 0) {
    //   expiresAt = new Date(
    //     Date.now() + dto.expiresInDays * 24 * 60 * 60 * 1000,
    //   );
    // }
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

  async getAgentById(agentId: string, userId: string): Promise<Agent> {
    const agent = await this.agentModel.findByPk(agentId, {
      include: [
        {
          model: Organization,
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

    const orgMembership = await this.organizationUserModel.findOne({
      where: {
        organizationId: agent.organizationId,
        userId,
      },
    });

    if (!orgMembership) {
      throw new ForbiddenException('You do not have access to this agent');
    }

    return agent;
  }

  async getAgentsByOrganization(
    organizationId: string,
    userId: string,
  ): Promise<Agent[]> {
    const orgMembership = await this.organizationUserModel.findOne({
      where: {
        organizationId,
        userId,
      },
    });

    if (!orgMembership) {
      throw new ForbiddenException(
        'You do not have access to agents in this organization',
      );
    }

    return this.agentModel.findAll({
      where: { organizationId },
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
