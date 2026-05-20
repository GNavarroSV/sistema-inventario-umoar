import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger, BadRequestException } from '@nestjs/common';
import { AppModule } from './app.module';

const main = async () => {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: '*',
  });

  // Configurar ValidationPipe global para transformaciones automáticas
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true, // Habilitar transformaciones automáticas
      transformOptions: {
        enableImplicitConversion: true, // Conversiones implícitas de tipos
      },
      whitelist: true, // Solo propiedades definidas en los DTOs
      forbidNonWhitelisted: false, // No rechazar propiedades extra (modo permisivo)
      exceptionFactory: (errors) => {
        const messages = errors.map((error) => {
          const constraints = error.constraints
            ? Object.values(error.constraints)
            : ['Error de validación'];
          return `${error.property}: ${constraints.join(', ')}`;
        });
        Logger.error(`Validation failed: ${messages.join('; ')}`);
        return new BadRequestException(messages);
      },
    }),
  );

  await app.listen(process.env.PORT ?? 3000);

  Logger.debug(
    `🚀 Aplicación corriendo en: http://localhost:${process.env.PORT ?? 3000}`,
  );

}
void main();