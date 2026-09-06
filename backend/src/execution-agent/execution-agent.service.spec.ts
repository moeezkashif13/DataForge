import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/sequelize';
import {
  UnauthorizedException,
  ForbiddenException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { ExecutionAgentService } from './execution-agent.service';
import { Agent, AgentStatus } from '../../models/agent.model';
import { ConnectionToken } from '../../models/connection-token.model';
import { Organization } from '../../models/organization.model';
import { OrganizationUser } from '../../models/organization-user.model';
import { CreateAgentDto } from './dto/create-agent.dto';

describe('ExecutionAgentService', () => {
  let service: ExecutionAgentService;
  let mockAgentModel: any;
  let mockConnectionTokenModel: any;
  let mockOrganizationModel: any;
  let mockOrganizationUserModel: any;

  beforeEach(async () => {
    mockAgentModel = {
      create: jest.fn(),
      findByPk: jest.fn(),
      findOne: jest.fn(),
      findAll: jest.fn(),
    };

    mockConnectionTokenModel = {
      create: jest.fn(),
    };

    mockOrganizationModel = {
      findByPk: jest.fn(),
    };

    mockOrganizationUserModel = {
      findOne: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExecutionAgentService,
        {
          provide: getModelToken(Agent),
          useValue: mockAgentModel,
        },
        {
          provide: getModelToken(ConnectionToken),
          useValue: mockConnectionTokenModel,
        },
        {
          provide: getModelToken(Organization),
          useValue: mockOrganizationModel,
        },
        {
          provide: getModelToken(OrganizationUser),
          useValue: mockOrganizationUserModel,
        },
      ],
    }).compile();

    service = module.get<ExecutionAgentService>(ExecutionAgentService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createAgent', () => {
    const validDto: CreateAgentDto = {
      organizationId: 'org-123',
      name: 'Primary Node Agent',
      description: 'On-prem runner agent',
    };

    it('should successfully create an agent if user belongs to the organization', async () => {
      mockOrganizationModel.findByPk.mockResolvedValue({ id: 'org-123' });
      mockOrganizationUserModel.findOne.mockResolvedValue({
        organizationId: 'org-123',
        userId: 'user-123',
      });
      mockAgentModel.findOne.mockResolvedValue(null);
      mockAgentModel.create.mockImplementation((data: any) =>
        Promise.resolve({ id: 'agent-001', ...data }),
      );

      const result = await service.createAgent(validDto, 'user-123');

      expect(mockOrganizationModel.findByPk).toHaveBeenCalledWith('org-123');
      expect(mockOrganizationUserModel.findOne).toHaveBeenCalledWith({
        where: { organizationId: 'org-123', userId: 'user-123' },
      });
      expect(mockAgentModel.create).toHaveBeenCalledWith({
        organizationId: 'org-123',
        createdBy: 'user-123',
        name: 'Primary Node Agent',
        description: 'On-prem runner agent',
        status: AgentStatus.ACTIVE,
      });
      expect(result.id).toBe('agent-001');
    });

    it('should throw ForbiddenException if user is not in the organization', async () => {
      mockOrganizationModel.findByPk.mockResolvedValue({ id: 'org-123' });
      mockOrganizationUserModel.findOne.mockResolvedValue(null);

      await expect(
        service.createAgent(validDto, 'unauthorized-user'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ConflictException if agent name already exists in the organization', async () => {
      mockOrganizationModel.findByPk.mockResolvedValue({ id: 'org-123' });
      mockOrganizationUserModel.findOne.mockResolvedValue({
        organizationId: 'org-123',
        userId: 'user-123',
      });
      mockAgentModel.findOne.mockResolvedValue({ id: 'existing-agent' });

      await expect(
        service.createAgent(validDto, 'user-123'),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw NotFoundException if organization does not exist', async () => {
      mockOrganizationModel.findByPk.mockResolvedValue(null);

      await expect(
        service.createAgent(validDto, 'user-123'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('generateConnectionToken', () => {
    it('should generate a secure token, store hashed version, and return plain token', async () => {
      mockAgentModel.findByPk.mockResolvedValue({
        id: 'agent-123',
        organizationId: 'org-123',
      });
      mockOrganizationUserModel.findOne.mockResolvedValue({
        organizationId: 'org-123',
        userId: 'user-123',
      });
      mockConnectionTokenModel.create.mockImplementation((data: any) =>
        Promise.resolve({ id: 'token-rec-1', ...data, createdAt: new Date() }),
      );

      const result = await service.generateConnectionToken(
        'agent-123',
        { expiresInDays: 7 },
        'user-123',
      );

      expect(result.token).toMatch(/^df_agent_[0-9a-f]{64}$/);
      expect(result.agentId).toBe('agent-123');
      expect(result.expiresAt).toBeInstanceOf(Date);
      expect(mockConnectionTokenModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          agentId: 'agent-123',
          token: expect.any(String), // hashed
          isRevoked: false,
        }),
      );
    });

    it('should throw ForbiddenException if user is not in agent organization', async () => {
      mockAgentModel.findByPk.mockResolvedValue({
        id: 'agent-123',
        organizationId: 'org-123',
      });
      mockOrganizationUserModel.findOne.mockResolvedValue(null);

      await expect(
        service.generateConnectionToken('agent-123', {}, 'user-attacker'),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
