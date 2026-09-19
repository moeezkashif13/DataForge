import './load-env';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { toNodeHandler } from 'better-auth/node';
import { auth, AUTH_BASE_PATH } from './auth/auth';
import { getCachedSession, setCachedSession } from './auth/session-cache';
import { fromNodeHeaders } from 'better-auth/node';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  app.enableCors({
    origin: true,
    credentials: true,
    exposedHeaders: ['set-auth-token'],
  });

  const authHandler = toNodeHandler(auth);
  const expressApp = app.getHttpAdapter().getInstance();
  expressApp.use(AUTH_BASE_PATH, async (req: any, res: any, next: any) => {
    if (req.path && req.path.startsWith('/sign-up')) {
      return res.status(403).json({
        statusCode: 403,
        error: 'Forbidden',
        message:
          'Direct user registration is disabled. Users can only be created upon organization registration or invitation acceptance.',
      });
    }

    if (req.method === 'GET' && req.path && req.path.startsWith('/get-session')) {
      const authHeader = req.headers['authorization'] || '';
      const cookieHeader = req.headers['cookie'] || '';
      const cacheKey = authHeader || cookieHeader;
      const cached = getCachedSession(cacheKey);
      if (cached) {
        return res.status(200).json(cached);
      }
    }

    return authHandler(req, res);
  });

  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();