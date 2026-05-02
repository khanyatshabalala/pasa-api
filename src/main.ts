import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // ── Global prefix ──────────────────────────────────────────────────────
  app.setGlobalPrefix('api/v1');

  // ── Validation ─────────────────────────────────────────────────────────
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,        // strip unknown properties
      forbidNonWhitelisted: true,
      transform: true,        // auto-transform payloads to DTO types
    }),
  );

  // ── CORS ───────────────────────────────────────────────────────────────
  app.enableCors({
    origin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
    credentials: true,
  });

  // ── Swagger (dev only) ─────────────────────────────────────────────────
  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('PASA API')
      .setDescription('Parent & School Administration API')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);
    console.log(`📚 Swagger docs: http://localhost:${process.env.PORT ?? 3001}/api/docs`);
  }

  const port = process.env.PORT ?? 3001;
  await app.listen(port);
  console.log(`🚀 PASA API running on http://localhost:${port}/api/v1`);
}

bootstrap();
