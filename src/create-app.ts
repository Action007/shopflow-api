import { INestApplication, ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';

export async function configureApp(
    app: INestApplication,
): Promise<INestApplication> {
    app.setGlobalPrefix('api/v1');

    app.use(helmet());
    app.use(compression());
    app.use(cookieParser());
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

    const config = new DocumentBuilder()
        .setTitle('Shopflow API')
        .setDescription('Shopflow e-commerce API documentation')
        .setVersion('1.0.0')
        .addBearerAuth()
        .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);

    return app;
}
