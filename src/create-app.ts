import { INestApplication, ValidationPipe } from '@nestjs/common';

export async function configureApp(
    app: INestApplication,
): Promise<INestApplication> {
    app.setGlobalPrefix('api/v1');

    app.useGlobalPipes(
        new ValidationPipe({
            whitelist: true,
            forbidNonWhitelisted: true,
            transform: true,
            transformOptions: { enableImplicitConversion: true },
        }),
    );

    return app;
}
