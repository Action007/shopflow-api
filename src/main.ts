import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { configureApp } from './create-app';

async function bootstrap() {
    const app = await NestFactory.create(AppModule);
    app.enableShutdownHooks();
    await configureApp(app);
    await app.listen(process.env.PORT ?? 3000);
}

bootstrap();
