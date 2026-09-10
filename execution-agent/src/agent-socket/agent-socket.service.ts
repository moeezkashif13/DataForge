import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { io, Socket } from 'socket.io-client';

export interface ConnectOptions {
  token?: string;
  backendUrl?: string;
}

@Injectable()
export class AgentSocketService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AgentSocketService.name);
  private socket: Socket | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private currentAgentId: string | null = null;
  private currentOrganizationId: string | null = null;
  private isAgentConnected = false;

  onModuleInit() {}

  onModuleDestroy() {
    this.disconnect();
  }

  /**
   * Connect to backend app:
   * 1. Call verifyConnectionToken on backend (POST /execution-agent/connect)
   * 2. Open 1-to-1 WebSocket connection to backend using the resulting accessToken
   */
  async connectToBackend(options?: ConnectOptions): Promise<{
    success: boolean;
    agentId?: string;
    organizationId?: string;
    message: string;
  }> {
    const backendUrl =
      options?.backendUrl || process.env.BACKEND_URL || 'http://localhost:3000';
    const rawToken =
      options?.token || process.env.AGENT_TOKEN || process.env.CONNECTION_TOKEN;

    if (!rawToken) {
      throw new Error(
        'Connection token is required. Provide it in the request body or set AGENT_TOKEN environment variable.',
      );
    }

    this.logger.log(
      `Step 1: Calling backend verifyConnectionToken at ${backendUrl}/execution-agent/connect...`,
    );

    const response = await fetch(`${backendUrl}/execution-agent/connect`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ token: rawToken.trim() }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      this.logger.error(
        `Backend token verification failed: ${response.status} - ${errorBody}`,
      );
      throw new Error(`Backend verification failed: ${errorBody}`);
    }

    const result = (await response.json()) as {
      statusCode: number;
      message: string;
      data?: {
        accessToken: string;
        agentId?: string;
        organizationId?: string;
      };
    };

    const accessToken = result.data?.accessToken;
    if (!accessToken) {
      throw new Error('Backend did not return an accessToken');
    }

    this.currentAgentId = result.data?.agentId || null;
    this.currentOrganizationId = result.data?.organizationId || null;

    this.logger.log(
      `Token verified! Agent ID: ${this.currentAgentId}. Step 2: Connecting via WebSocket for 1-to-1 communication...`,
    );

    await this.initSocketConnection(backendUrl, accessToken);

    return {
      success: true,
      agentId: this.currentAgentId || undefined,
      organizationId: this.currentOrganizationId || undefined,
      message:
        'Execution agent successfully connected to backend via WebSockets (1-to-1 communication ready)',
    };
  }

  private initSocketConnection(
    backendUrl: string,
    accessToken: string,
  ): Promise<void> {
    return new Promise((resolve) => {
      if (this.socket) {
        this.socket.disconnect();
      }

      this.socket = io(backendUrl, {
        auth: {
          token: accessToken,
        },
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 2000,
      });

      this.socket.on('connect', () => {
        this.logger.log(
          `[WebSocket] Connected to backend! Socket ID: ${this.socket?.id}`,
        );
        this.isAgentConnected = true;
        this.startHeartbeat();
        resolve();
      });

      this.socket.on('agent:connected', (data: any) => {
        this.logger.log(
          `[1-to-1] Confirmed connection with backend: ${JSON.stringify(data)}`,
        );
      });

      this.socket.on('disconnect', (reason: string) => {
        this.logger.warn(`[WebSocket] Disconnected from backend: ${reason}`);
        this.isAgentConnected = false;
        this.stopHeartbeat();
      });

      this.socket.on('connect_error', (error: any) => {
        this.logger.error(`[WebSocket] Connection error: ${error.message}`);
      });

      // Listen for commands/events sent from the backend to this agent
      this.socket.on('backend:command', (payload: any) => {
        this.logger.log(
          `[1-to-1 Command from Backend]:\n${JSON.stringify(payload, null, 2)}`,
        );
      });

      // Resolve within 5 seconds even if socket is still negotiating
      setTimeout(() => {
        resolve();
      }, 5000);
    });
  }

  /**
   * Send a 1-to-1 message/event from this agent to the backend
   */
  sendMessageToBackend(event: string, payload: any): boolean {
    if (!this.socket || !this.isAgentConnected) {
      this.logger.warn(
        `Cannot send message "${event}": socket is not connected to backend`,
      );
      return false;
    }
    this.socket.emit(event, payload);
    this.logger.debug(`Sent 1-to-1 message "${event}" to backend`);
    return true;
  }

  private startHeartbeat() {
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      if (this.socket && this.isAgentConnected) {
        this.socket.emit('agent:heartbeat', {
          agentId: this.currentAgentId,
          timestamp: new Date().toISOString(),
        });
      }
    }, 30000);
  }

  private stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  disconnect() {
    this.stopHeartbeat();
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.isAgentConnected = false;
    this.logger.log('Disconnected execution agent from backend');
  }

  getStatus() {
    return {
      connected: this.isAgentConnected,
      agentId: this.currentAgentId,
      organizationId: this.currentOrganizationId,
      socketId: this.socket?.id || null,
    };
  }
}
