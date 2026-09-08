import {
  Body,
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Param,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import { ExecutionAgentService } from './execution-agent.service';
import { CreateAgentDto } from './dto/create-agent.dto';
import { GenerateConnectionTokenDto } from './dto/generate-token.dto';
import { AllowAnonymous, CurrentUser } from '../auth/auth.guard';

@Controller('execution-agent')
export class ExecutionAgentController {
  constructor(private readonly executionAgentService: ExecutionAgentService) {}

  @Post('create')
  async create(
    @Body() body: CreateAgentDto,
    @CurrentUser() user: { id: string } | null,
  ) {
    if (!user?.id) {
      throw new UnauthorizedException(
        'Authentication required to create an execution agent',
      );
    }

    try {
      const agent = await this.executionAgentService.createAgent(body, user.id);

      return {
        statusCode: HttpStatus.CREATED,
        message: 'Execution agent created successfully',
        data: agent,
      };
    } catch (error: any) {
      throw new HttpException(
        error.message || 'Internal server error',
        error.status || HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Post(':agentId/token')
  async generateToken(
    @Param('agentId') agentId: string,
    @Body() body: GenerateConnectionTokenDto,
    @CurrentUser() user: { id: string },
  ) {
    try {
      const tokenResult =
        await this.executionAgentService.generateConnectionToken(
          agentId,
          body,
          user.id,
        );

      return {
        statusCode: HttpStatus.CREATED,
        message: 'Connection token generated successfully',
        data: tokenResult,
      };
    } catch (error: any) {
      throw new HttpException(
        error.message || 'Internal server error',
        error.status || HttpStatus.BAD_REQUEST,
      );
    }
  }
}
