import { Body, Controller, Get, Post } from '@nestjs/common';
import { AppService } from './app.service';
import { AgentSocketService } from './agent-socket/agent-socket.service';
import { BackgroundJobsService } from './background-jobs/background-jobs.service';
import type { MigrationJobData } from './background-jobs/background-jobs.types';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly agentSocketService: AgentSocketService,
    private readonly backgroundJobsService: BackgroundJobsService,
  ) {}

  @Post('connect')
  async connectToBackend(
    @Body() body: { token?: string; backendUrl?: string },
  ) {
    return this.agentSocketService.connectToBackend(body);
  }

  @Get('status')
  getStatus() {
    return this.agentSocketService.getStatus();
  }

  @Get('jobs/metrics')
  async getJobMetrics() {
    return this.backgroundJobsService.getQueueMetrics();
  }

  @Post('jobs/trigger')
  async triggerMigrationJob(@Body() body: MigrationJobData) {
    const job = await this.backgroundJobsService.addMigrationJob(body || {});
    return {
      success: true,
      message: 'Migration job queued in BullMQ',
      jobId: job.id,
      name: job.name,
    };
  }

  @Get('api-docs-json')
  getOpenApiSpec() {
    const fs = require('fs');
    const path = require('path');
    const candidates = [
      path.resolve(process.cwd(), 'openapi.json'),
      path.resolve(__dirname, '../openapi.json'),
      path.resolve(__dirname, '../../openapi.json'),
    ];
    for (const p of candidates) {
      if (fs.existsSync(p)) {
        return JSON.parse(fs.readFileSync(p, 'utf8'));
      }
    }
    return { error: 'OpenAPI specification not found' };
  }

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }
}

