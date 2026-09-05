import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { OrganizationModule } from './organization/organization.module';
import { AuthModule } from './auth/auth.module';
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
      host: process.env.DB_HOST || 'localhost',
      port: Number(process.env.DB_PORT) || 5432,
      username: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'root',
      database: process.env.DB_NAME || 'dataforge',

      autoLoadModels: true,
      synchronize: false,
    }),

    AuthModule,
    OrganizationModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
