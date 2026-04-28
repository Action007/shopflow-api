import {
    BadRequestException,
    ValidationError,
    ValidationPipe,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import express from 'express';
import { ErrorMessage } from './common/constants/error-messages';
import { getUploadDirPath } from './upload/constants/upload.constants';

export async function configureApp(
    app: NestExpressApplication,
): Promise<NestExpressApplication> {
    const configService = app.get(ConfigService);
    const uploadDir = getUploadDirPath(
        configService.getOrThrow<string>('UPLOAD_DIR'),
    );
    const trustProxy = configService.get<boolean>('TRUST_PROXY') ?? false;
    app.setGlobalPrefix('api/v1');
    console.log('[app] trust proxy debug', {
        value: trustProxy,
        type: typeof trustProxy,
    });
    app.set('trust proxy', trustProxy);

    app.use(helmet());
    app.use(compression());
    app.use(cookieParser());
    app.use(
        '/uploads',
        express.static(uploadDir, {
            setHeaders: (res) => {
                res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
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
            exceptionFactory: (errors: ValidationError[]) =>
                new BadRequestException({
                    message: ErrorMessage.VALIDATION_FAILED,
                    errors: formatValidationErrors(errors),
                }),
        }),
    );

    const config = new DocumentBuilder()
        .setTitle('Shopflow API')
        .setDescription(
            'Shopflow e-commerce API documentation. Most endpoints return a success envelope in the form { success, data, timestamp }. The health endpoint returns the raw Terminus response. Refresh tokens are returned in the auth response body, and /auth/refresh expects the client to send that token back in a cookie named refresh_token.',
        )
        .setVersion('1.0.0')
        .addBearerAuth(
            {
                type: 'http',
                scheme: 'bearer',
                bearerFormat: 'JWT',
                description:
                    'Paste access token received from /auth/login or /auth/register',
            },
            'access-token',
        )
        .addCookieAuth(
            'refresh_token',
            {
                type: 'apiKey',
                in: 'cookie',
                description:
                    'Client-managed refresh token cookie. The backend reads refresh_token on /auth/refresh, but does not set the cookie automatically.',
            },
            'refresh-token',
        )
        .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);

    return app;
}

function formatValidationErrors(
    validationErrors: ValidationError[],
    parentPath = '',
): Record<string, string[]> {
    return validationErrors.reduce<Record<string, string[]>>((acc, error) => {
        const path = parentPath
            ? `${parentPath}.${error.property}`
            : error.property;
        const fieldErrors = Object.values(error.constraints ?? {});

        if (fieldErrors.length > 0) {
            acc[path] = fieldErrors;
        }

        if (error.children?.length) {
            Object.assign(acc, formatValidationErrors(error.children, path));
        }

        return acc;
    }, {});
}
