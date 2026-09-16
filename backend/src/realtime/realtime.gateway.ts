import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { JwtService } from '@nestjs/jwt';
import { Server, Socket } from 'socket.io';
import { instrument } from '@socket.io/admin-ui';
import { Agent, AgentStatus } from '../../models/agent.model';
import { Migration, MigrationStatus } from '../../models/migration.model';
import { Project } from '../../models/project.model';

interface SocketData {
  agentId?: string;
  organizationId?: string;
  projectId?: string;
  authenticated?: boolean;
  clientType?: 'agent' | 'frontend' | 'unknown';
}

@WebSocketGateway({
  cors: {
    origin: (
      origin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void,
    ) => {
      callback(null, true);
    },
    credentials: true,
  },
})
export class RealtimeGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(RealtimeGateway.name);

  // Track connected execution agents: agentId -> Set of socket IDs
  private readonly connectedAgents = new Map<string, Set<string>>();

  constructor(
    @InjectModel(Agent)
    private readonly agentModel: typeof Agent,
    @InjectModel(Migration)
    private readonly migrationModel: typeof Migration,
    @InjectModel(Project)
    private readonly projectModel: typeof Project,
    private readonly jwtService: JwtService,
  ) {}

  afterInit(server: Server) {
    try {
      instrument(server, {
        auth: false,
        mode: 'development',
      });
      this.logger.log(
        'Realtime WebSocket Gateway initialized with Socket.IO Admin UI support',
      );
    } catch (err: any) {
      this.logger.warn(
        `Failed to initialize Socket.IO Admin UI: ${err.message}`,
      );
    }
  }

  async handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);

    const clientType =
      client.handshake.auth?.clientType || client.handshake.query?.clientType;

    // Handle Frontend client connection
    if (clientType === 'frontend') {
      client.data = {
        clientType: 'frontend',
        authenticated: true,
      };
      this.logger.log(`[Frontend] Web client connected: ${client.id}`);
      client.emit('frontend:connected', {
        status: 'connected',
        socketId: client.id,
        timestamp: new Date().toISOString(),
      });
      return;
    }

    // Extract auth token from handshake auth, query, or headers
    const rawToken =
      client.handshake.auth?.token ||
      client.handshake.query?.token ||
      this.extractBearerToken(client.handshake.headers?.authorization);

    if (!rawToken || typeof rawToken !== 'string') {
      // General client connection without immediate token
      return;
    }

    await this.authenticateAgentSocket(client, rawToken.trim());
  }

  async handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);

    const agentId = (client.data as SocketData)?.agentId;
    if (agentId) {
      const sockets = this.connectedAgents.get(agentId);
      if (sockets) {
        sockets.delete(client.id);
        if (sockets.size === 0) {
          this.connectedAgents.delete(agentId);

          // Update agent connection status to false in database
          try {
            await this.agentModel.update(
              {
                status: AgentStatus.ACTIVE,
                lastHeartbeatAt: new Date(),
              } as any,
              { where: { id: agentId } },
            );
            this.logger.log(
              `Agent [${agentId}] disconnected. Status updated to connected=false`,
            );

            // Notify organization room
            const orgId = (client.data as SocketData)?.organizationId;
            if (orgId && this.server) {
              this.server.to(`org:${orgId}`).emit('agent:status', {
                agentId,
                status: AgentStatus.ACTIVE,
                disconnectedAt: new Date().toISOString(),
              });
            }

            // Notify project room
            const projId = (client.data as SocketData)?.projectId;
            if (projId && this.server) {
              this.server.to(`project:${projId}`).emit('agent:status', {
                agentId,
                status: AgentStatus.ACTIVE,
                disconnectedAt: new Date().toISOString(),
              });
            }
          } catch (err: any) {
            this.logger.error(
              `Failed to update agent disconnected status: ${err.message}`,
            );
          }
        }
      }
    }
  }

  /**
   * Authenticate and register an agent socket for 1-to-1 communication
   */
  async authenticateAgentSocket(
    client: Socket,
    token: string,
  ): Promise<boolean> {
    try {
      const secret =
        process.env.DEFAULT_JWT_SECRET ||
        process.env.JWT_SECRET ||
        process.env.AUTH_SECRET ||
        'dataforge-agent-secret-key';

      const payload = this.jwtService.verify(token, { secret }) as {
        agent_id?: string;
        organization_id?: string;
        project_id?: string;
        type?: string;
      };

      if (!payload?.agent_id) {
        this.logger.warn(`Socket authentication failed: missing agent_id`);
        client.emit('auth:error', {
          message: 'Invalid token: missing agent identity',
        });
        return false;
      }

      const agentId = payload.agent_id;
      let organizationId = payload.organization_id;
      let projectId = payload.project_id;

      if (!projectId) {
        const dbAgent = await this.agentModel.findByPk(agentId);
        if (dbAgent) {
          projectId = dbAgent.projectId;
          organizationId = organizationId || dbAgent.organizationId;
        }
      }

      // Associate socket data
      client.data = {
        agentId,
        organizationId,
        projectId,
        authenticated: true,
      };

      // Join 1-to-1 room dedicated to this agent
      client.join(`agent:${agentId}`);
      if (organizationId) {
        client.join(`org:${organizationId}`);
      }
      if (projectId) {
        client.join(`project:${projectId}`);
      }

      // Track in connected agents map
      if (!this.connectedAgents.has(agentId)) {
        this.connectedAgents.set(agentId, new Set());
      }
      this.connectedAgents.get(agentId)!.add(client.id);

      // Update agent in DB
      await this.agentModel.update(
        {
          status: AgentStatus.CONNECTED,
          lastHeartbeatAt: new Date(),
        } as any,
        { where: { id: agentId } },
      );

      this.logger.log(
        `Agent [${agentId}] successfully connected via WebSocket (1-to-1 room: agent:${agentId})`,
      );

      // Acknowledge back to the agent (1-to-1)
      client.emit('agent:connected', {
        agentId,
        connected: AgentStatus.CONNECTED,
        message: '1-to-1 socket connection established with backend',
        timestamp: new Date().toISOString(),
      });

      // Notify organization room that agent is online
      if (organizationId && this.server) {
        this.server.to(`org:${organizationId}`).emit('agent:status', {
          agentId,
          connected: AgentStatus.CONNECTED,
          connectedAt: new Date().toISOString(),
        });
      }

      // Notify project room that agent is online
      if (projectId && this.server) {
        this.server.to(`project:${projectId}`).emit('agent:status', {
          agentId,
          connected: AgentStatus.CONNECTED,
          connectedAt: new Date().toISOString(),
        });
      }

      // Automatically check and dispatch pending migrations for this agent
      await this.dispatchPendingMigrations(
        client,
        agentId,
        projectId as string,
        organizationId,
      );

      return true;
    } catch (error: any) {
      this.logger.warn(
        `Socket token verification failed for client ${client.id}: ${error.message}`,
      );
      client.emit('auth:error', {
        message: 'Authentication failed',
        error: error.message,
      });
      return false;
    }
  }

  /**
   * Look up pending/active migrations for this agent and send relevant details
   */
  async dispatchPendingMigrations(
    client: Socket,
    agentId: string,
    projectId: string,
    organizationId?: string,
  ) {
    try {
      const projectWhere = {
        project: projectId,
      };
      // if (organizationId) {
      //   projectWhere.organizationId = organizationId;
      // }

      const pendingMigrations = await this.migrationModel.findAll({
        where: {
          status: MigrationStatus.READY,
        },
        include: [
          {
            model: Project,
            // where: projectId?projectId:undefined,
            // Object.keys(projectWhere).length > 0 ? projectWhere : undefined,
            attributes: ['id', 'name', 'organizationId'],
          },
        ],
        order: [['createdAt', 'ASC']],
      });

      // const formattedMigrations = pendingMigrations.map((m) => ({
      //   id: m.id,
      //   name: m.name,
      //   description: m.description,
      //   status: m.status,
      //   projectId: m.projectId,
      //   projectName: m.project?.name || null,
      //   createdAt: m.createdAt,
      // }));

      const payload = {
        agentId,
        organizationId: organizationId || null,
        count: pendingMigrations.length,
        migrations: pendingMigrations,
        message:
          pendingMigrations.length > 0
            ? `Found ${pendingMigrations.length} pending migration(s) available for processing.`
            : 'No pending migrations found at this time.',
        timestamp: new Date().toISOString(),
      };

      if (pendingMigrations.length > 0) {
        this.logger.log(
          `Found ${pendingMigrations.length} pending migration(s) for agent [${agentId}]. Sending details...`,
        );
      } else {
        this.logger.log(`No pending migrations found for agent [${agentId}].`);
      }

      // Emit on the unified backend:command channel
      client.emit('backend:command', {
        command: 'PROCESS_MIGRATION',
        ...payload,
      });
    } catch (error: any) {
      this.logger.error(
        `Failed to check pending migrations for agent [${agentId}]: ${error.message}`,
      );
    }
  }

  @SubscribeMessage('agent:heartbeat')
  async handleAgentHeartbeat(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: any,
  ) {
    const agentId = (client.data as SocketData)?.agentId;
    if (agentId) {
      await this.agentModel.update({ lastHeartbeatAt: new Date() } as any, {
        where: { id: agentId },
      });
    }
    return {
      event: 'agent:heartbeat_ack',
      timestamp: new Date().toISOString(),
      echo: data,
    };
  }

  @SubscribeMessage('agent:message')
  handleAgentMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: any,
  ) {
    const agentId = (client.data as SocketData)?.agentId;
    this.logger.log(
      `Received 1-to-1 message from agent [${agentId}]: ${JSON.stringify(data)}`,
    );
    return {
      status: 'received',
      agentId,
      timestamp: new Date().toISOString(),
    };
  }

  @SubscribeMessage('ping')
  handlePing(@ConnectedSocket() client: Socket, @MessageBody() data: any) {
    return {
      event: 'pong',
      data: {
        timestamp: new Date().toISOString(),
        echo: data,
      },
    };
  }

  @SubscribeMessage('join')
  handleJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { room: string },
  ) {
    if (payload?.room) {
      client.join(payload.room);
      this.logger.log(`Client ${client.id} joined room ${payload.room}`);
      return { status: 'joined', room: payload.room };
    }
    return { status: 'error', message: 'Room name is required' };
  }

  @SubscribeMessage('leave')
  handleLeave(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { room: string },
  ) {
    if (payload?.room) {
      client.leave(payload.room);
      this.logger.log(`Client ${client.id} left room ${payload.room}`);
      return { status: 'left', room: payload.room };
    }
    return { status: 'error', message: 'Room name is required' };
  }

  /**
   * Listen for commands emitted by the Frontend
   */
  @SubscribeMessage('frontend:command')
  async handleFrontendCommand(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    payload: {
      type: string;
      payload?: any;
      meta?: {
        timestamp?: string;
        projectId?: string;
        organizationId?: string;
        correlationId?: string;
      };
    },
  ) {
    const commandType = payload?.type || 'UNKNOWN';
    this.logger.log(
      `[Frontend Command from ${client.id}]: Type="${commandType}" Payload=${JSON.stringify(payload?.payload || {})}`,
    );

    const { type, payload: commandData, meta } = payload || {};

    // Forward to project room if requested
    if (meta?.projectId) {
      this.server.to(`project:${meta.projectId}`).emit('backend:command', {
        type: `${type}`,
        payload: commandData,
        meta: {
          timestamp: new Date().toISOString(),
          fromSocketId: client.id,
          ...meta,
        },
      });
    }

    // Forward to organization room if requested
    if (meta?.organizationId) {
      this.server.to(`org:${meta.organizationId}`).emit('backend:command', {
        type: `${type}`,
        payload: commandData,
        meta: {
          timestamp: new Date().toISOString(),
          fromSocketId: client.id,
          ...meta,
        },
      });
    }

    return {
      status: 'acknowledged',
      type: commandType,
      receivedAt: new Date().toISOString(),
    };
  }

  /**
   * Listen for agent notification that a migration has started execution
   */
  @SubscribeMessage('agent:migration:started')
  async handleAgentMigrationStarted(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    payload: {
      migrationId: string;
      agentId?: string;
      projectId?: string;
      organizationId?: string;
      status?: string;
      timestamp?: string;
    },
  ) {
    const { migrationId, agentId, projectId, organizationId } = payload || {};

    this.logger.log(
      `[Agent Event] Migration started execution: ID="${migrationId}" | Agent="${agentId}" | Project="${projectId}"`,
    );

    if (migrationId) {
      // 1. Update database record to 'Running'
      try {
        await this.migrationModel.update(
          { status: MigrationStatus.RUNNING } as any,
          { where: { id: migrationId }, validate: false },
        );
        this.logger.log(
          `[Database] Migration [${migrationId}] status updated to "${MigrationStatus.RUNNING}"`,
        );
      } catch (err: any) {
        this.logger.error(
          `[Database] Failed to update migration [${migrationId}] status: ${err.message}`,
        );
      }

      // 2. Broadcast status change exclusively to the organization room
      let targetOrgId = organizationId;
      if (!targetOrgId) {
        try {
          const migrationRecord = await this.migrationModel.findByPk(
            migrationId,
            {
              include: [
                { model: Project, attributes: ['id', 'organizationId'] },
              ],
            },
          );
          targetOrgId =
            migrationRecord?.project?.organizationId ||
            (migrationRecord as any)?.organizationId;
        } catch {}
      }

      const eventPayload = {
        migrationId,
        status: MigrationStatus.RUNNING,
        agentId,
        projectId,
        organizationId: targetOrgId,
        timestamp: new Date().toISOString(),
      };

      const commandEnvelope = {
        type: 'MIGRATION_STATUS_CHANGED',
        payload: eventPayload,
        meta: {
          timestamp: new Date().toISOString(),
          organizationId: targetOrgId,
          projectId,
        },
      };

      if (targetOrgId) {
        this.server
          .to(`org:${targetOrgId}`)
          .emit('backend:command', commandEnvelope);
        this.logger.log(
          `[Realtime] Emitted MIGRATION_STATUS_CHANGED (Running) exclusively to room "org:${targetOrgId}" for migration "${migrationId}"`,
        );
      } else {
        this.logger.warn(
          `[Realtime] Could not determine organizationId for migration "${migrationId}". Status update was not broadcast.`,
        );
      }
    }

    return {
      status: 'acknowledged',
      migrationId,
      newStatus: MigrationStatus.RUNNING,
    };
  }

  @SubscribeMessage('agent:migration:completed')
  async handleAgentMigrationCompleted(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    payload: {
      migrationId?: string;
      agentId?: string;
      projectId?: string;
      organizationId?: string;
      status?: string;
      rowsInserted?: number;
      totalDurationSec?: string;
      timestamp?: string;
    },
  ) {
    const { migrationId, agentId, projectId, organizationId } = payload || {};

    this.logger.log(
      `[Agent Event] Migration completed execution: ID="${migrationId}" | Agent="${agentId}" | Rows=${payload?.rowsInserted} in ${payload?.totalDurationSec}s`,
    );

    if (migrationId) {
      // 1. Update database record to 'Completed'
      try {
        await this.migrationModel.update(
          { status: MigrationStatus.COMPLETED } as any,
          { where: { id: migrationId }, validate: false },
        );
        this.logger.log(
          `[Database] Migration [${migrationId}] status updated to "${MigrationStatus.COMPLETED}"`,
        );
      } catch (err: any) {
        this.logger.error(
          `[Database] Failed to update migration [${migrationId}] status to Completed: ${err.message}`,
        );
      }

      // 2. Broadcast status change exclusively to the organization room
      let targetOrgId = organizationId;
      if (!targetOrgId) {
        try {
          const migrationRecord = await this.migrationModel.findByPk(
            migrationId,
            {
              include: [
                { model: Project, attributes: ['id', 'organizationId'] },
              ],
            },
          );
          targetOrgId =
            migrationRecord?.project?.organizationId ||
            (migrationRecord as any)?.organizationId;
        } catch {}
      }

      const eventPayload = {
        migrationId,
        status: MigrationStatus.COMPLETED,
        agentId,
        projectId,
        organizationId: targetOrgId,
        rowsInserted: payload?.rowsInserted,
        totalDurationSec: payload?.totalDurationSec,
        progress: 100,
        timestamp: new Date().toISOString(),
      };

      const commandEnvelope = {
        type: 'MIGRATION_STATUS_CHANGED',
        payload: eventPayload,
        meta: {
          timestamp: new Date().toISOString(),
          organizationId: targetOrgId,
          projectId,
        },
      };

      if (targetOrgId) {
        this.server
          .to(`org:${targetOrgId}`)
          .emit('backend:command', commandEnvelope);
        this.logger.log(
          `[Realtime] Emitted MIGRATION_STATUS_CHANGED (Completed) exclusively to room "org:${targetOrgId}" for migration "${migrationId}"`,
        );
      } else {
        this.logger.warn(
          `[Realtime] Could not determine organizationId for migration "${migrationId}". Status update was not broadcast.`,
        );
      }
    }

    return {
      status: 'acknowledged',
      migrationId,
      newStatus: MigrationStatus.COMPLETED,
    };
  }

  @SubscribeMessage('agent:migration:failed')
  async handleAgentMigrationFailed(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    payload: {
      migrationId?: string;
      agentId?: string;
      projectId?: string;
      organizationId?: string;
      status?: string;
      error?: string;
      timestamp?: string;
    },
  ) {
    const { migrationId, agentId, projectId, organizationId, error } =
      payload || {};

    this.logger.error(
      `[Agent Event] Migration failed execution: ID="${migrationId}" | Agent="${agentId}" | Error="${error}"`,
    );

    if (migrationId) {
      try {
        await this.migrationModel.update(
          { status: MigrationStatus.FAILED } as any,
          { where: { id: migrationId }, validate: false },
        );
        this.logger.log(
          `[Database] Migration [${migrationId}] status updated to "${MigrationStatus.FAILED}"`,
        );
      } catch (err: any) {
        this.logger.error(
          `[Database] Failed to update migration [${migrationId}] status to Failed: ${err.message}`,
        );
      }

      let targetOrgId = organizationId;
      if (!targetOrgId) {
        try {
          const migrationRecord = await this.migrationModel.findByPk(
            migrationId,
            {
              include: [
                { model: Project, attributes: ['id', 'organizationId'] },
              ],
            },
          );
          targetOrgId =
            migrationRecord?.project?.organizationId ||
            (migrationRecord as any)?.organizationId;
        } catch {}
      }

      const eventPayload = {
        migrationId,
        status: MigrationStatus.FAILED,
        agentId,
        projectId,
        organizationId: targetOrgId,
        error,
        timestamp: new Date().toISOString(),
      };

      const commandEnvelope = {
        type: 'MIGRATION_STATUS_CHANGED',
        payload: eventPayload,
        meta: {
          timestamp: new Date().toISOString(),
          organizationId: targetOrgId,
          projectId,
        },
      };

      if (targetOrgId) {
        this.server
          .to(`org:${targetOrgId}`)
          .emit('backend:command', commandEnvelope);
        this.logger.log(
          `[Realtime] Emitted MIGRATION_STATUS_CHANGED (Failed) exclusively to room "org:${targetOrgId}" for migration "${migrationId}"`,
        );
      }
    }

    return {
      status: 'acknowledged',
      migrationId,
      newStatus: MigrationStatus.FAILED,
    };
  }

  /**
   * Send a structured command to a frontend room or specific client socket
   */
  sendCommandToFrontend(
    target: string, // e.g. "project:123", "org:456", or specific socketId
    type: string,
    payload?: any,
    meta?: any,
  ): boolean {
    if (!this.server) return false;
    const envelope = {
      type,
      payload,
      meta: {
        timestamp: new Date().toISOString(),
        ...meta,
      },
    };
    this.server.to(target).emit('backend:command', envelope);
    this.logger.log(`[Backend Command] Sent "${type}" to target "${target}"`);
    return true;
  }

  private extractBearerToken(authHeader?: string | string[]): string | null {
    if (!authHeader || typeof authHeader !== 'string') return null;
    const [type, token] = authHeader.split(' ');
    if (type?.toLowerCase() === 'bearer' && token) {
      return token.trim();
    }
    return authHeader.trim();
  }

  isAgentConnected(agentId: string): boolean {
    const sockets = this.connectedAgents.get(agentId);
    return !!sockets && sockets.size > 0;
  }

  getConnectedAgentIds(): string[] {
    return Array.from(this.connectedAgents.keys());
  }
}
