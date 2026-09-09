import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AgentSocketService } from './agent-socket/agent-socket.service';

@Module({
  imports: [],
  controllers: [AppController],
  providers: [AppService, AgentSocketService],
})
export class AppModule {}
