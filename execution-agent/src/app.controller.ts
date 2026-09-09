import { Body, Controller, Get, Post, Query, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { AppService } from './app.service';
import { AgentSocketService } from './agent-socket/agent-socket.service';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly agentSocketService: AgentSocketService,
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

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get(['stream-customers', 'stream'])
  async streamCustomers(
    @Req() req: Request,
    @Res() res: Response,
    @Query('limit') limit?: string,
    @Query('batch') batch?: string,
    @Query('eco') eco?: string,
    @Query('gzip') gzip?: string,
    @Query('firstBatchOnly') firstBatchOnly?: string,
  ) {
    const parsedLimit = limit ? parseInt(limit, 10) : 10000;
    const parsedBatch = batch ? parseInt(batch, 10) : 1000;
    // const isEco = eco === 'true' || eco === '1';
    // const isGzip = gzip === 'true' || gzip === '1';
    const isEco = true;
    const isGzip = true;
    // Defaults to true for testing: exits after the first batch is inserted
    const isFirstBatchOnly = firstBatchOnly !== 'false';

    await this.appService.streamCustomers(req, res, {
      limit: parsedLimit,
      batchLogSize: parsedBatch,
      ecoMode: isEco,
      gzip: isGzip,
      firstBatchOnly: isFirstBatchOnly,
    });
  }
}
