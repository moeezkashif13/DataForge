import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { OrganizationModule } from './organization/organization.module';
import { SequelizeModule } from '@nestjs/sequelize';
import { Organization } from 'models/organization.model';
import { User } from 'models/user.model';
import { OrganizationUser } from 'models/organization-user.model';
import { OrganizationInvitation } from 'models/organization-invitation.model';
import { Project } from 'models/project.model';
import { ProjectUser } from 'models/project-user.model';

@Module({
  imports: [
    SequelizeModule.forRoot({
      dialect: 'postgres',
      host: 'localhost',
      port: 5432,
      username: 'postgres',
      password: 'root',
      database: 'dataforge',

      autoLoadModels: true,
      synchronize: false,
    }),
    // SequelizeModule.forFeature([Organization, User, OrganizationUser]),

    OrganizationModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
