import { INestApplication, ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import compression from 'compression';

export async function configureApp(
    app: INestApplication,
): Promise<INestApplication> {
    app.setGlobalPrefix('api/v1');

    app.use(helmet());
    app.use(compression());
    app.enableCors({
        origin: '*',
        credentials: true,
    });

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
