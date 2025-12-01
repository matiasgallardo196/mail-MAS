import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { IS_DEVELOPMENT, NODE_ENV, CORS_ORIGIN, PORT, IS_PRODUCTION } from './config/env.loader';
import { Logger } from 'nestjs-pino';
import { Reflector } from '@nestjs/core';
import { ClassSerializerInterceptor } from '@nestjs/common';
import helmet from 'helmet';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });

  // Logger configuration
  const logger = app.get(Logger);
  app.useLogger(logger);

  // Class serializer configuration
  const reflector = app.get(Reflector);
  app.useGlobalInterceptors(new ClassSerializerInterceptor(reflector));

  // Helmet configuration
  app.use(
    helmet({
      ...(IS_PRODUCTION ? {} : { contentSecurityPolicy: false }),
    }),
  );

  // Swagger configuration
  const config = new DocumentBuilder()
    .setTitle('Boiler Plate Nest JS')
    .setDescription('Boiler Plate Nest JS API')
    .setVersion('1.0')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  if (IS_DEVELOPMENT) {
    SwaggerModule.setup('docs', app, document);
  }

  // CORS configuration
  app.enableCors({
    origin: CORS_ORIGIN,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // Server configuration
  await app.listen(PORT);
  logger.log(`Server is running on port ${PORT}`);
  if (IS_DEVELOPMENT) logger.log(`Docs are running on port ${PORT}/docs`);
  logger.log(`Environment: ${NODE_ENV}`);
}

bootstrap();
