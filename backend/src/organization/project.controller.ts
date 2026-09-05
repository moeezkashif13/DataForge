import {
  Body,
  Controller,
  HttpException,
  HttpStatus,
  Post,
} from '@nestjs/common';
import { ProjectService } from './project.service';

@Controller('organization/projects')
export class ProjectController {
  constructor(private readonly projectService: ProjectService) {}

  @Post('create')
  async createProject(
    @Body()
    body: {
      organizationId: string;
      name: string;
      description?: string;
      status?: string;
      userIds: string[];
    },
  ) {
    const { organizationId, name, description, status, userIds } = body;

    if (!organizationId || !name) {
      throw new HttpException(
        'organizationId and name are required',
        HttpStatus.BAD_REQUEST,
      );
    }

    try {
      const { project, associatedUsers } =
        await this.projectService.createProjectWithUsers({
          organizationId,
          name,
          description,
          status,
          userIds: userIds || [],
        });

      return {
        statusCode: 201,
        message: 'Project created successfully',
        projectId: project.id,
        name: project.name,
        associatedUsers,
      };
    } catch (error) {
      console.error('Error creating project:', error);
      throw new HttpException(
        error.message || 'Internal server error',
        error.status || HttpStatus.BAD_REQUEST,
      );
    }
  }
}
