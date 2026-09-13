import {
  Body,
  Controller,
  Delete,
  Get,
  HttpException,
  HttpStatus,
  Param,
  Post,
  Query,
  UnauthorizedException,
} from '@nestjs/common';
import { ExecutionAgentService } from './execution-agent.service';
import { CreateAgentDto } from './dto/create-agent.dto';
import { GenerateConnectionTokenDto } from './dto/generate-token.dto';
import { AllowAnonymous, CurrentUser } from '../auth/auth.guard';

@Controller('execution-agent')
export class ExecutionAgentController {
  constructor(private readonly executionAgentService: ExecutionAgentService) {}

  @Get()
  async getAgents(
    @CurrentUser() user: { id: string } | null,
    @Query('organizationId') organizationId?: string,
    @Query('projectId') projectId?: string,
  ) {
    if (!user?.id) {
      throw new UnauthorizedException(
        'Authentication required to retrieve execution agents',
      );
    }

    try {
      const agents = await this.executionAgentService.getAgentsForUser(
        user.id,
        organizationId,
        projectId,
      );

      return {
        statusCode: HttpStatus.OK,
        agents,
      };
    } catch (error: any) {
      throw new HttpException(
        error.message || 'Internal server error',
        error.status || HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Get(':agentId')
  async getAgent(
    @Param('agentId') agentId: string,
    @CurrentUser() user: { id: string } | null,
  ) {
    if (!user?.id) {
      throw new UnauthorizedException(
        'Authentication required to retrieve agent details',
      );
    }

    try {
      const agent = await this.executionAgentService.getAgentById(
        agentId,
        user.id,
      );

      return {
        statusCode: HttpStatus.OK,
        agent,
      };
    } catch (error: any) {
      throw new HttpException(
        error.message || 'Internal server error',
        error.status || HttpStatus.BAD_REQUEST,
      );
    }
  }

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

  @Delete(':agentId')
  async deleteAgent(
    @Param('agentId') agentId: string,
    @CurrentUser() user: { id: string } | null,
  ) {
    if (!user?.id) {
      throw new UnauthorizedException(
        'Authentication required to delete an execution agent',
      );
    }

    try {
      const result = await this.executionAgentService.deleteAgent(
        agentId,
        user.id,
      );

      return {
        statusCode: HttpStatus.OK,
        message: 'Execution agent and related tokens deleted successfully',
        data: result,
      };
    } catch (error: any) {
      throw new HttpException(
        error.message || 'Internal server error',
        error.status || HttpStatus.BAD_REQUEST,
      );
    }
  }
}
