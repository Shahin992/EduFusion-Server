import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ExpressAdapter } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';

export async function createApp(adapter?: ExpressAdapter) {
  const isVercel = process.env.VERCEL === '1';

  console.log(`[Bootstrap] Starting NestJS app (Vercel: ${isVercel})`);
  const start = Date.now();

  const app = adapter
    ? await NestFactory.create(AppModule, adapter)
    : await NestFactory.create(AppModule);

  app.setGlobalPrefix('api');

  app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
  });

  app.enableCors();
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalInterceptors(new TransformInterceptor());
  app.useGlobalFilters(new AllExceptionsFilter());

  // Skip Swagger on Vercel to save bootstrap time
  if (!isVercel) {
    const config = new DocumentBuilder()
      .setTitle('EduFusion API')
      .setDescription('The EduFusion Management System API description')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);
  }

  await app.init();
  console.log(`[Bootstrap] NestJS app initialized in ${Date.now() - start}ms`);

  return app;
}
