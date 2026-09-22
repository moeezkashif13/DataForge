import { Module, forwardRef } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { BullBoardModule } from '@bull-board/nestjs';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { BackgroundJobsService } from './background-jobs.service';
import { BackgroundJobsProcessor } from './background-jobs.processor';
import { MigrationExecutionService } from './migration-execution.service';
import { MIGRATION_QUEUE } from './background-jobs.types';
import { AppModule } from '../app.module';

@Module({
  imports: [
    forwardRef(() => AppModule),
    BullModule.registerQueue({
      name: MIGRATION_QUEUE,
    }),
    BullBoardModule.forFeature({
      name: MIGRATION_QUEUE,
      adapter: BullMQAdapter,
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
