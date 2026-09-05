import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { toNodeHandler } from 'better-auth/node';
import { auth, AUTH_BASE_PATH } from './auth/auth';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: true,
    credentials: true,
  });

  const authHandler = toNodeHandler(auth);
  const expressApp = app.getHttpAdapter().getInstance();
  expressApp.use(AUTH_BASE_PATH, (req: any, res: any, next: any) => {
    if (req.path && req.path.startsWith('/sign-up')) {
      return res.status(403).json({
        statusCode: 403,
        error: 'Forbidden',
        message:
          'Direct user registration is disabled. Users can only be created upon organization registration or invitation acceptance.',
      });
    }
    return authHandler(req, res);
  });

  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();