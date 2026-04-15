import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { configureApp } from './create-app';
import { UPLOAD_DIR } from './upload/constants/upload.constants';
import { NestExpressApplication } from '@nestjs/platform-express';

async function bootstrap() {
    const app = await NestFactory.create<NestExpressApplication>(AppModule);

    app.enableShutdownHooks();

    app.useStaticAssets(UPLOAD_DIR, {
        prefix: '/uploads/',
    });

    await configureApp(app);

    await app.listen(process.env.PORT ?? 3000);
}

bootstrap();