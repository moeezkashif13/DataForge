import { Module, forwardRef } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { BackgroundJobsService } from './background-jobs.service';
import { BackgroundJobsProcessor } from './background-jobs.processor';
import { MigrationExecutionService } from './migration-execution.service';
import { MIGRATION_QUEUE } from './background-jobs.types';
import { AppModule } from '../app.module';

@Module({
  imports: [
    forwardRef(() => AppModule),
    BullModule.forRootAsync({
      useFactory: () => ({
        connection: {
          host: process.env.REDIS_HOST || 'localhost',
          port: Number(process.env.REDIS_PORT) || 6379,
          password: process.env.REDIS_PASSWORD || undefined,
        },
      }),
    }),
    BullModule.registerQueue({
      name: MIGRATION_QUEUE,
    }),
  ],
  providers: [
    BackgroundJobsService,
    BackgroundJobsProcessor,
    MigrationExecutionService,
  ],
  exports: [BackgroundJobsService, MigrationExecutionService, BullModule],
})
export class BackgroundJobsModule {}
