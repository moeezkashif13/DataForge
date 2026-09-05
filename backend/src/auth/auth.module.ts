import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { BetterAuthGuard } from './auth.guard';

@Module({
  providers: [
    {
      provide: APP_GUARD,
      useClass: BetterAuthGuard,
    },
  ],
})
export class AuthModule {}