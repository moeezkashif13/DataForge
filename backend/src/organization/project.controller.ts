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

  @Get(':id')
  async getProjectById(
    @Param('id') id: string,
    @CurrentUser() user: { id: string },
  ) {
    if (!user?.id) {
      throw new UnauthorizedException(
        'Authentication required to retrieve project details',
      );
    }

    try {
      const project = await this.projectService.getProjectDetails(id, user.id);

      return {
        statusCode: HttpStatus.OK,
        project,
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

  @Delete(':id')
  async deleteProject(
    @Param('id') id: string,
    @CurrentUser() user: { id: string },
  ) {
    if (!user?.id) {
      throw new UnauthorizedException(
        'Authentication required to delete a project',
      );
    }

    try {
      const result = await this.projectService.deleteProject(id, user.id);

      return {
        statusCode: HttpStatus.OK,
        message: 'Project deleted successfully',
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
