import { Injectable, Logger } from '@nestjs/common';
import { RealtimeGateway } from './realtime.gateway';

@Injectable()
export class RealtimeService {
  private readonly logger = new Logger(RealtimeService.name);

  constructor(private readonly realtimeGateway: RealtimeGateway) {}

  /**
   * Send a 1-to-1 event/message to a specific execution agent
   */
  sendToAgent(agentId: string, event: string, payload: any): boolean {
    if (!this.realtimeGateway?.server) {
      this.logger.warn(
        `Cannot send event "${event}" to agent "${agentId}": server not ready`,
      );
      return false;
    }
    this.realtimeGateway.server.to(`agent:${agentId}`).emit(event, payload);
    this.logger.debug(`Sent 1-to-1 event "${event}" to agent "${agentId}"`);
    return true;
  }

  /**
   * Broadcast an event to all connected WebSocket clients.
   */
  emitToAll(event: string, payload: any): void {
    if (this.realtimeGateway?.server) {
      this.realtimeGateway.server.emit(event, payload);
      this.logger.debug(`Emitted event "${event}" to all clients`);
    }
  }

  /**
   * Emit an event to clients joined in a specific room.
   */
  emitToRoom(room: string, event: string, payload: any): void {
    if (this.realtimeGateway?.server) {
      this.realtimeGateway.server.to(room).emit(event, payload);
      this.logger.debug(`Emitted event "${event}" to room "${room}"`);
    }
  }

  /**
   * Helper to emit an event to a specific agent's room (`agent:{agentId}`).
   */
  emitToAgent(agentId: string, event: string, payload: any): void {
    this.emitToRoom(`agent:${agentId}`, event, payload);
  }

  /**
   * Helper to emit an event to a specific organization's room (`org:{organizationId}`).
   */
  emitToOrg(organizationId: string, event: string, payload: any): void {
    this.emitToRoom(`org:${organizationId}`, event, payload);
  }

  /**
   * Helper to emit an event to a specific project's room (`project:{projectId}`).
   */
  emitToProject(projectId: string, event: string, payload: any): void {
    this.emitToRoom(`project:${projectId}`, event, payload);
  }

  /**
   * Check if a specific agent is currently connected
   */
  isAgentConnected(agentId: string): boolean {
    return this.realtimeGateway.isAgentConnected(agentId);
  }

  /**
   * List all currently connected agent IDs
   */
  getConnectedAgents(): string[] {
    return this.realtimeGateway.getConnectedAgentIds();
  }

  /**
   * Direct access to the Socket.IO Server instance.
   */
  getServer() {
    return this.realtimeGateway?.server;
  }
}
