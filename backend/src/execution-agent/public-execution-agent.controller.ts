import {
  Body,
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { ExecutionAgentService } from './execution-agent.service';
import { RealtimeService } from '../realtime/realtime.service';
import { ConnectAgentDto } from './dto/connect-agent.dto';
import { AllowAnonymous } from '../auth/auth.guard';

@Controller('execution-agent')
export class PublicExecutionAgentController {
  constructor(
    private readonly executionAgentService: ExecutionAgentService,
    private readonly realtimeService: RealtimeService,
  ) {}

  @AllowAnonymous()
  @Post(':agentId/command')
  async sendCommand(
    @Param('agentId') agentId: string,
    @Body() body: any,
  ) {
    const isConnected = this.realtimeService.isAgentConnected(agentId);
    const sent = this.realtimeService.sendToAgent(
      agentId,
      'backend:command',
      body,
    );

    return {
      statusCode: HttpStatus.OK,
      message: sent
        ? 'Command dispatched to agent successfully'
        : 'Agent is not currently connected to WebSocket',
      data: {
        agentId,
        isAgentConnected: isConnected,
        delivered: sent,
        payload: body,
      },
    };
  }

  @AllowAnonymous()
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post(['connect', 'authenticate', 'verify'])
  async connect(@Body() body: ConnectAgentDto) {
    try {
      const result = await this.executionAgentService.verifyConnectionToken(
        body.token,
      );

      return {
        statusCode: HttpStatus.OK,
        message: 'Agent authenticated successfully',
        data: {
          accessToken: result.accessToken,
          agentId: result.agentId,
          organizationId: result.organizationId,
        },
        // token: result.token,
        // accessToken: result.token,
      };
    } catch (error: any) {
      console.log(error);

      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        error.message || 'Authentication failed',
        error.status || HttpStatus.UNAUTHORIZED,
      );
    }
  }
}
