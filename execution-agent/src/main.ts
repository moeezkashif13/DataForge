import './load-env';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { AgentSocketService } from './agent-socket/agent-socket.service';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);
  const port = process.env.PORT ?? 3500;
  await app.listen(port);
  logger.log(
    `Execution Agent has successfully started on http://localhost:${port}`,
  );

  const agentSocketService = app.get(AgentSocketService);
  try {
    await agentSocketService.connectToBackend();
  } catch (err: any) {
    logger.error(`Initial auto-connection to backend failed: ${err.message}`);
  }
}
void bootstrap();
