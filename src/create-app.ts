import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import express from 'express';
import { UPLOAD_DIR } from './upload/constants/upload.constants';

export async function configureApp(
    app: INestApplication,
): Promise<INestApplication> {
    const configService = app.get(ConfigService);
    app.setGlobalPrefix('api/v1');

    app.use(helmet());
    app.use(compression());
    app.use(cookieParser());
    app.use(
        '/uploads',
        express.static(UPLOAD_DIR, {
            setHeaders: (res) => {
                res.setHeader(
                    'Cross-Origin-Resource-Policy',
                    'cross-origin',
                );
                res.setHeader('Access-Control-Allow-Origin', '*');
            },
        }),
    );
    const allowedOrigins = configService
        .getOrThrow<string>('CORS_ORIGINS')
        .split(',')
        .map((origin) => origin.trim())
        .filter(Boolean);

    app.enableCors({
        origin: (origin, callback) => {
            if (!origin || allowedOrigins.includes(origin)) {
                callback(null, true);
                return;
            }

            callback(new Error(`Origin ${origin} is not allowed by CORS`));
        },
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
