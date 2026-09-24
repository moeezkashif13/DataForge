import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { BullBoardModule } from '@bull-board/nestjs';
import { ExpressAdapter } from '@bull-board/express';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AgentSocketService } from './agent-socket/agent-socket.service';
import { BackgroundJobsModule } from './background-jobs/background-jobs.module';
import { OptimizedBackgroundJobsModule } from './optimized-background-jobs/optimized-background-jobs.module';
import { MetricsModule } from './metrics/metrics.module';

@Module({
  imports: [
    BullModule.forRootAsync({
      useFactory: () => ({
        connection: {
          host: process.env.REDIS_HOST || 'localhost',
          port: Number(process.env.REDIS_PORT) || 6379,
          password: process.env.REDIS_PASSWORD || undefined,
        },
      }),
    }),
    BullBoardModule.forRoot({
      route: '/admin/queues',
      adapter: ExpressAdapter,
    }),
    BackgroundJobsModule,
    OptimizedBackgroundJobsModule,
    MetricsModule,
  ],
  controllers: [AppController],
  providers: [AppService, AgentSocketService],
  exports: [AgentSocketService],
})
export class AppModule {}

