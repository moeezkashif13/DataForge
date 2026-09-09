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
import { Agent } from '../../models/agent.model';

interface SocketData {
  agentId?: string;
  organizationId?: string;
  authenticated?: boolean;
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
                connected: false,
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
                connected: false,
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
      const organizationId = payload.organization_id;

      // Associate socket data
      client.data = {
        agentId,
        organizationId,
        authenticated: true,
      };

      // Join 1-to-1 room dedicated to this agent
      client.join(`agent:${agentId}`);
      if (organizationId) {
        client.join(`org:${organizationId}`);
      }

      // Track in connected agents map
      if (!this.connectedAgents.has(agentId)) {
        this.connectedAgents.set(agentId, new Set());
      }
      this.connectedAgents.get(agentId)!.add(client.id);

      // Update agent in DB
      await this.agentModel.update(
        {
          connected: true,
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
        connected: true,
        message: '1-to-1 socket connection established with backend',
        timestamp: new Date().toISOString(),
      });

      // Notify organization room that agent is online
      if (organizationId && this.server) {
        this.server.to(`org:${organizationId}`).emit('agent:status', {
          agentId,
          connected: true,
          connectedAt: new Date().toISOString(),
        });
      }

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

  // @SubscribeMessage('agent:authenticate')
  // async handleExplicitAuth(
  //   @ConnectedSocket() client: Socket,
  //   @MessageBody() data: { token: string },
  // ) {
  //   if (!data?.token) {
  //     return { success: false, message: 'Token is required' };
  //   }
  //   const success = await this.authenticateAgentSocket(client, data.token);
  //   return { success };
  // }

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
