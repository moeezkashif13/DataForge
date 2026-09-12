import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/sequelize';
import { JwtService } from '@nestjs/jwt';
import { RealtimeGateway } from './realtime.gateway';
import { RealtimeService } from './realtime.service';
import { Agent } from '../../models/agent.model';
import { Migration, MigrationStatus } from '../../models/migration.model';
import { Project } from '../../models/project.model';

describe('RealtimeModule', () => {
  let gateway: RealtimeGateway;
  let service: RealtimeService;
  let mockAgentModel: any;
  let mockMigrationModel: any;
  let mockProjectModel: any;
  let mockJwtService: any;

  beforeEach(async () => {
    mockAgentModel = {
      update: jest.fn().mockResolvedValue([1]),
    };

    mockMigrationModel = {
      findAll: jest.fn().mockResolvedValue([
        {
          id: 'mig-001',
          name: 'Users Table Migration',
          status: MigrationStatus.ACTIVE,
          projectId: 'proj-001',
          project: { name: 'Core DB Project' },
          createdAt: new Date(),
        },
      ]),
    };

    mockProjectModel = {
      findAll: jest.fn().mockResolvedValue([]),
    };

    mockJwtService = {
      verify: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RealtimeGateway,
        RealtimeService,
        {
          provide: getModelToken(Agent),
          useValue: mockAgentModel,
        },
        {
          provide: getModelToken(Migration),
          useValue: mockMigrationModel,
        },
        {
          provide: getModelToken(Project),
          useValue: mockProjectModel,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
      ],
    }).compile();

    gateway = module.get<RealtimeGateway>(RealtimeGateway);
    service = module.get<RealtimeService>(RealtimeService);
  });

  it('gateway and service should be defined', () => {
    expect(gateway).toBeDefined();
    expect(service).toBeDefined();
  });

  describe('agent authentication and pending migrations dispatch', () => {
    it('should authenticate agent socket, join 1-to-1 room, update DB, and dispatch pending migrations', async () => {
      mockJwtService.verify.mockReturnValue({
        agent_id: 'agent-123',
        organization_id: 'org-456',
        type: 'ea_token',
      });

      const mockSocket = {
        id: 'socket-agent-1',
        data: {},
        join: jest.fn(),
        emit: jest.fn(),
      } as any;

      const success = await gateway.authenticateAgentSocket(
        mockSocket,
        'valid-jwt-token',
      );

      expect(success).toBe(true);
      expect(mockSocket.join).toHaveBeenCalledWith('agent:agent-123');
      expect(mockSocket.join).toHaveBeenCalledWith('org:org-456');
      expect(mockAgentModel.update).toHaveBeenCalledWith(
        expect.objectContaining({ connected: true }),
        { where: { id: 'agent-123' } },
      );
      expect(mockSocket.emit).toHaveBeenCalledWith(
        'agent:connected',
        expect.objectContaining({ agentId: 'agent-123', connected: true }),
      );
      expect(mockMigrationModel.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { status: MigrationStatus.ACTIVE },
        }),
      );
      expect(mockSocket.emit).toHaveBeenCalledWith(
        'backend:command',
        expect.objectContaining({
          command: 'PROCESS_MIGRATION',
          count: 1,
          migrations: expect.arrayContaining([
            expect.objectContaining({ id: 'mig-001', name: 'Users Table Migration' }),
          ]),
        }),
      );
      expect(gateway.isAgentConnected('agent-123')).toBe(true);
    });

    it('should update agent connected=false on disconnect when no remaining sockets', async () => {
      // First connect
      mockJwtService.verify.mockReturnValue({
        agent_id: 'agent-123',
        organization_id: 'org-456',
      });
      const mockSocket = {
        id: 'socket-agent-1',
        data: {},
        join: jest.fn(),
        emit: jest.fn(),
      } as any;
      await gateway.authenticateAgentSocket(mockSocket, 'valid-token');

      // Now disconnect
      await gateway.handleDisconnect(mockSocket);

      expect(mockAgentModel.update).toHaveBeenCalledWith(
        expect.objectContaining({ connected: false }),
        { where: { id: 'agent-123' } },
      );
      expect(gateway.isAgentConnected('agent-123')).toBe(false);
    });
  });

  describe('ping', () => {
    it('should return pong with timestamp', () => {
      const mockSocket = {} as any;
      const response = gateway.handlePing(mockSocket, { test: 123 });
      expect(response.event).toBe('pong');
      expect(response.data.echo).toEqual({ test: 123 });
    });
  });

  describe('room handling', () => {
    it('should allow joining a room', () => {
      const mockSocket = {
        id: 'client-1',
        join: jest.fn(),
      } as any;

      const res = gateway.handleJoin(mockSocket, { room: 'test-room' });
      expect(mockSocket.join).toHaveBeenCalledWith('test-room');
      expect(res.status).toBe('joined');
    });

    it('should allow leaving a room', () => {
      const mockSocket = {
        id: 'client-1',
        leave: jest.fn(),
      } as any;

      const res = gateway.handleLeave(mockSocket, { room: 'test-room' });
      expect(mockSocket.leave).toHaveBeenCalledWith('test-room');
      expect(res.status).toBe('left');
    });
  });

  describe('RealtimeService 1-to-1 agent messaging', () => {
    it('should send 1-to-1 event to agent room', () => {
      const mockEmit = jest.fn();
      const mockTo = jest.fn().mockReturnValue({ emit: mockEmit });
      gateway.server = { to: mockTo } as any;

      service.sendToAgent('agent-123', 'backend:command', { action: 'run_job' });
      expect(mockTo).toHaveBeenCalledWith('agent:agent-123');
      expect(mockEmit).toHaveBeenCalledWith('backend:command', { action: 'run_job' });
    });
  });
});
