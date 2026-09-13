import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/sequelize';
import { JwtService } from '@nestjs/jwt';
import {
  UnauthorizedException,
  ForbiddenException,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { ExecutionAgentService } from './execution-agent.service';
import { Agent, AgentStatus } from '../../models/agent.model';
import { ConnectionToken } from '../../models/connection-token.model';
import { Organization } from '../../models/organization.model';
import { OrganizationUser } from '../../models/organization-user.model';
import { Project } from '../../models/project.model';
import { ProjectUser } from '../../models/project-user.model';
import { CreateAgentDto } from './dto/create-agent.dto';

describe('ExecutionAgentService', () => {
  let service: ExecutionAgentService;
  let mockAgentModel: any;
  let mockConnectionTokenModel: any;
  let mockOrganizationModel: any;
  let mockOrganizationUserModel: any;
  let mockProjectModel: any;
  let mockProjectUserModel: any;
  let mockJwtService: any;

  beforeEach(async () => {
    mockAgentModel = {
      create: jest.fn(),
      findByPk: jest.fn(),
      findOne: jest.fn(),
      findAll: jest.fn(),
    };

    mockConnectionTokenModel = {
      create: jest.fn(),
      findOne: jest.fn(),
    };

    mockOrganizationModel = {
      findByPk: jest.fn(),
    };

    mockOrganizationUserModel = {
      findOne: jest.fn(),
      findAll: jest.fn(),
    };

    mockProjectModel = {
      findByPk: jest.fn(),
    };

    mockProjectUserModel = {
      findOne: jest.fn(),
      findAll: jest.fn(),
    };

    mockJwtService = {
      sign: jest.fn().mockReturnValue('mocked.jwt.token'),
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
        {
          provide: getModelToken(Project),
          useValue: mockProjectModel,
        },
        {
          provide: getModelToken(ProjectUser),
          useValue: mockProjectUserModel,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
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
      projectId: 'proj-123',
      name: 'Primary Node Agent',
      description: 'On-prem runner agent',
    };

    it('should successfully create an agent if user belongs to the project', async () => {
      mockProjectModel.findByPk.mockResolvedValue({
        id: 'proj-123',
        organizationId: 'org-123',
      });
      mockProjectUserModel.findOne.mockResolvedValue({
        projectId: 'proj-123',
        userId: 'user-123',
      });
      mockAgentModel.findOne.mockResolvedValue(null);
      mockAgentModel.create.mockImplementation((data: any) =>
        Promise.resolve({ id: 'agent-001', ...data }),
      );

      const result = await service.createAgent(validDto, 'user-123');

      expect(mockProjectModel.findByPk).toHaveBeenCalledWith('proj-123');
      expect(mockProjectUserModel.findOne).toHaveBeenCalledWith({
        where: { projectId: 'proj-123', userId: 'user-123' },
      });
      expect(mockAgentModel.create).toHaveBeenCalledWith({
        organizationId: 'org-123',
        projectId: 'proj-123',
        createdBy: 'user-123',
        name: 'Primary Node Agent',
        description: 'On-prem runner agent',
        status: AgentStatus.ACTIVE,
      });
      expect(result.id).toBe('agent-001');
    });

    it('should throw ForbiddenException if user is not in the project', async () => {
      mockProjectModel.findByPk.mockResolvedValue({
        id: 'proj-123',
        organizationId: 'org-123',
      });
      mockProjectUserModel.findOne.mockResolvedValue(null);

      await expect(
        service.createAgent(validDto, 'unauthorized-user'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ConflictException if agent name already exists in the project', async () => {
      mockProjectModel.findByPk.mockResolvedValue({
        id: 'proj-123',
        organizationId: 'org-123',
      });
      mockProjectUserModel.findOne.mockResolvedValue({
        projectId: 'proj-123',
        userId: 'user-123',
      });
      mockAgentModel.findOne.mockResolvedValue({ id: 'existing-agent' });

      await expect(
        service.createAgent(validDto, 'user-123'),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw NotFoundException if project does not exist', async () => {
      mockProjectModel.findByPk.mockResolvedValue(null);

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
        projectId: 'proj-123',
      });
      mockProjectUserModel.findOne.mockResolvedValue({
        projectId: 'proj-123',
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

    it('should throw ForbiddenException if user is not in agent project', async () => {
      mockAgentModel.findByPk.mockResolvedValue({
        id: 'agent-123',
        organizationId: 'org-123',
        projectId: 'proj-123',
      });
      mockProjectUserModel.findOne.mockResolvedValue(null);

      await expect(
        service.generateConnectionToken('agent-123', {}, 'user-attacker'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('verifyConnectionToken', () => {
    const rawToken =
      'df_agent_abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890';
    const mockAgent = {
      id: 'agent-uuid-001',
      name: 'Worker Node 1',
      organizationId: 'org-uuid-001',
      projectId: 'proj-uuid-001',
      status: AgentStatus.ACTIVE,
      lastHeartbeatAt: null,
      connected: false,
      save: jest.fn().mockResolvedValue(true),
    };

    it('should successfully verify a valid connection token and return JWT with agent_id, organization_id, and project_id', async () => {
      const mockTokenRecord = {
        id: 'token-rec-001',
        agentId: mockAgent.id,
        isRevoked: false,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // future
        lastUsedAt: null,
        agent: mockAgent,
        save: jest.fn().mockResolvedValue(true),
      };

      mockConnectionTokenModel.findOne.mockResolvedValue(mockTokenRecord);

      const result = await service.verifyConnectionToken(rawToken);

      expect(mockConnectionTokenModel.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            token: expect.any(String), // hashed token
          }),
        }),
      );
      expect(mockJwtService.sign).toHaveBeenCalledWith(
        {
          agent_id: 'agent-uuid-001',
          organization_id: 'org-uuid-001',
          project_id: 'proj-uuid-001',
          type: 'ea_token',
        },
        expect.objectContaining({
          secret: expect.any(String),
        }),
      );
      expect(mockTokenRecord.save).toHaveBeenCalled();
      expect(mockTokenRecord.isRevoked).toBe(true);
      expect(mockAgent.connected).toBe(true);
      expect(mockAgent.save).toHaveBeenCalled();
      expect(result.accessToken).toBe('mocked.jwt.token');
      expect(result.agentId).toBe('agent-uuid-001');
      expect(result.organizationId).toBe('org-uuid-001');
      expect(result.projectId).toBe('proj-uuid-001');
    });

    it('should throw UnauthorizedException when token is missing or empty', async () => {
      await expect(service.verifyConnectionToken('')).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.verifyConnectionToken('   ')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException when token is not found in database', async () => {
      mockConnectionTokenModel.findOne.mockResolvedValue(null);

      await expect(
        service.verifyConnectionToken('invalid_token'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when token is revoked', async () => {
      mockConnectionTokenModel.findOne.mockResolvedValue({
        id: 'token-rec-revoked',
        isRevoked: true,
        expiresAt: new Date(Date.now() + 100000),
      });

      await expect(
        service.verifyConnectionToken(rawToken),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when token is expired', async () => {
      mockConnectionTokenModel.findOne.mockResolvedValue({
        id: 'token-rec-expired',
        isRevoked: false,
        expiresAt: new Date(Date.now() - 100000), // in the past
      });

      await expect(
        service.verifyConnectionToken(rawToken),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when agent is inactive', async () => {
      mockConnectionTokenModel.findOne.mockResolvedValue({
        id: 'token-rec-001',
        agentId: mockAgent.id,
        isRevoked: false,
        expiresAt: new Date(Date.now() + 100000),
        agent: {
          ...mockAgent,
          status: AgentStatus.INACTIVE,
        },
      });

      await expect(
        service.verifyConnectionToken(rawToken),
      ).rejects.toThrow(UnauthorizedException);
    });
  });
});
