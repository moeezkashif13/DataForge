import {
  Body,
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { ExecutionAgentService } from './execution-agent.service';
import { ConnectAgentDto } from './dto/connect-agent.dto';
import { AllowAnonymous } from '../auth/auth.guard';

@Controller('execution-agent')
export class PublicExecutionAgentController {
  constructor(private readonly executionAgentService: ExecutionAgentService) {}

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
          // token: result.token,
          accessToken: result.accessToken,
          // agent_id: result.agentId,
          // organization_id: result.organizationId,
          // agent: result.agent,
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
