import { Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { OrganizationModule } from './organization/organization.module';
import { AuthModule } from './auth/auth.module';
import { SequelizeModule } from '@nestjs/sequelize';
import { MigrationsModule } from './migrations/migrations.module';
import { ExecutionAgentModule } from './execution-agent/execution-agent.module';
import { RealtimeModule } from './realtime/realtime.module';

import { databaseConfig } from './config/database.config';

@Module({
  imports: [
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 60,
      },
    ]),
    SequelizeModule.forRoot({
      dialect: 'postgres',
      host: databaseConfig.host,
      port: databaseConfig.port,
      username: databaseConfig.username,
      password: databaseConfig.password,
      database: databaseConfig.database,

      autoLoadModels: true,
      logging: false,
      synchronize: false,

      pool: databaseConfig.sequelizePool,
    }),

    AuthModule,
    OrganizationModule,
    MigrationsModule,
    ExecutionAgentModule,
    RealtimeModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
