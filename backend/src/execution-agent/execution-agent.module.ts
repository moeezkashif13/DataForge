import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { ExecutionAgentController } from './execution-agent.controller';
import { ExecutionAgentService } from './execution-agent.service';
import { Agent } from '../../models/agent.model';
import { ConnectionToken } from '../../models/connection-token.model';
import { Organization } from '../../models/organization.model';
import { OrganizationUser } from '../../models/organization-user.model';
import { User } from '../../models/user.model';

@Module({
  imports: [
    SequelizeModule.forFeature([
      Agent,
      ConnectionToken,
      Organization,
      OrganizationUser,
      User,
    ]),
  ],
  controllers: [ExecutionAgentController],
  providers: [ExecutionAgentService],
  exports: [ExecutionAgentService],
})
export class ExecutionAgentModule {}
