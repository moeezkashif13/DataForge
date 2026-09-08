import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { JwtModule } from '@nestjs/jwt';
import { ExecutionAgentController } from './execution-agent.controller';
import { ExecutionAgentService } from './execution-agent.service';
import { Agent } from '../../models/agent.model';
import { ConnectionToken } from '../../models/connection-token.model';
import { Organization } from '../../models/organization.model';
import { OrganizationUser } from '../../models/organization-user.model';
import { User } from '../../models/user.model';
import { PublicExecutionAgentController } from './public-execution-agent.controller';

@Module({
  imports: [
    SequelizeModule.forFeature([
      Agent,
      ConnectionToken,
      Organization,
      OrganizationUser,
      User,
    ]),
    JwtModule.register({
      secret: process.env.DEFAULT_JWT_SECRET,
      signOptions: {
        expiresIn: process.env.DEFAULT_JWT_EXPIRES_IN as any,
      },
    }),
  ],
  controllers: [ExecutionAgentController, PublicExecutionAgentController],
  providers: [ExecutionAgentService],
  exports: [ExecutionAgentService],
})
export class ExecutionAgentModule {}
