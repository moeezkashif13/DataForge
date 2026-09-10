import {
  Body,
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Post,
  Query,
  UnauthorizedException,
} from '@nestjs/common';
import { ProjectService } from './project.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { CurrentUser } from '../auth/auth.guard';

@Controller('organization/projects')
export class ProjectController {
  constructor(private readonly projectService: ProjectService) {}

  @Get()
  async getProjects(
    @CurrentUser() user: { id: string },
    @Query('organizationId') organizationId?: string,
  ) {
    try {
      const result =
        await this.projectService.getProjectsForUserOrganization(
          user?.id,
          organizationId,
        );

      return {
        statusCode: HttpStatus.OK,
        organizationId: result.organizationId,
        projects: result.projects,
      };
    } catch (error: any) {
      throw new HttpException(
        error.message || 'Internal server error',
        error.status || HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Post('create')
  async createProject(
    @Body() body: CreateProjectDto,
    @CurrentUser() user: { id: string },
  ) {
    try {
      const { project, associatedUsers } =
        await this.projectService.createProjectWithUsers(body, user.id);

      return {
        statusCode: HttpStatus.CREATED,
        message: 'Project created successfully',
        projectId: project.id,
        name: project.name,
        status: project.status,
        // associatedUsers,
      };
    } catch (error: any) {
      throw new HttpException(
        error.message || 'Internal server error',
        error.status || HttpStatus.BAD_REQUEST,
      );
    }
  }
}
