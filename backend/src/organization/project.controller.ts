import {
  Body,
  Controller,
  HttpException,
  HttpStatus,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import { ProjectService } from './project.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { CurrentUser } from '../auth/auth.guard';

@Controller('organization/projects')
export class ProjectController {
  constructor(private readonly projectService: ProjectService) {}

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
