import { Global, Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { JwtModule } from '@nestjs/jwt';
import { RealtimeGateway } from './realtime.gateway';
import { RealtimeService } from './realtime.service';
import { Agent } from '../../models/agent.model';

@Global()
@Module({
  imports: [
    SequelizeModule.forFeature([Agent]),
    JwtModule.register({
      secret:
        process.env.DEFAULT_JWT_SECRET ||
        process.env.JWT_SECRET ||
        process.env.AUTH_SECRET ||
        'dataforge-agent-secret-key',
      signOptions: {
        expiresIn: (process.env.DEFAULT_JWT_EXPIRES_IN || '1d') as any,
      },
    }),
  ],
  providers: [RealtimeGateway, RealtimeService],
  exports: [RealtimeGateway, RealtimeService],
})
export class RealtimeModule {}
