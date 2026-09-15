import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AgentSocketService } from './agent-socket/agent-socket.service';
import { BackgroundJobsService } from './background-jobs/background-jobs.service';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        AppService,
        {
          provide: AgentSocketService,
          useValue: {
            connectToBackend: jest.fn(),
            getStatus: jest.fn(),
          },
        },
        {
          provide: BackgroundJobsService,
          useValue: {
            addMigrationJob: jest.fn(),
            getQueueMetrics: jest.fn(),
          },
        },
      ],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(appController.getHello()).toBe('Hello World!');
    });
  });
});
