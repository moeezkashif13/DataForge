import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AgentSocketService } from './agent-socket/agent-socket.service';
import { BackgroundJobsModule } from './background-jobs/background-jobs.module';

@Module({
  imports: [BackgroundJobsModule],
  controllers: [AppController],
  providers: [AppService, AgentSocketService],
})
export class AppModule {}
