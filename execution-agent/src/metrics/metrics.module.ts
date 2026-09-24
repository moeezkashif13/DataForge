import { Module, Global } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { MetricsService } from './metrics.service';
import { MetricsController } from './metrics.controller';
import { MIGRATION_QUEUE } from '../background-jobs/background-jobs.types';
import { OPTIMIZED_JOBS_QUEUE } from '../optimized-background-jobs/optimized-background-jobs.types';

@Global()
@Module({
  imports: [
    BullModule.registerQueue(
      { name: MIGRATION_QUEUE },
      { name: OPTIMIZED_JOBS_QUEUE },
    ),
  ],
  controllers: [MetricsController],
  providers: [MetricsService],
  exports: [MetricsService],
})
export class MetricsModule {}
