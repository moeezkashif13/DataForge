import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { BullBoardModule } from '@bull-board/nestjs';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { OptimizedBackgroundJobsService } from './optimized-background-jobs.service';
import { OptimizedBackgroundJobsProcessor } from './optimized-background-jobs.processor';
import { OptimizedBackgroundJobsController } from './optimized-background-jobs.controller';
import { OPTIMIZED_JOBS_QUEUE } from './optimized-background-jobs.types';

@Module({
  imports: [
    BullModule.registerQueue({
      name: OPTIMIZED_JOBS_QUEUE,
    }),
    BullBoardModule.forFeature({
      name: OPTIMIZED_JOBS_QUEUE,
      adapter: BullMQAdapter,
    }),
  ],
  controllers: [OptimizedBackgroundJobsController],
  providers: [
    OptimizedBackgroundJobsService,
    OptimizedBackgroundJobsProcessor,
  ],
  exports: [
    OptimizedBackgroundJobsService,
    BullModule,
  ],
})
export class OptimizedBackgroundJobsModule {}
