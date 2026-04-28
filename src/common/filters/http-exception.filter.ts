import {
    ExceptionFilter,
    Catch,
    ArgumentsHost,
    HttpException,
    HttpStatus,
    BadRequestException,
    Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

import { ErrorMessage } from '../constants/error-messages';
import { PrismaErrorCode } from '../constants/prisma-error-codes';
import {
    PrismaClientKnownRequestError,
    PrismaClientValidationError,
} from '@prisma/client/runtime/library';
import {
    ensureRequestId,
    formatRequestLogLine,
    getMatchedRoute,
    getRequestDurationMs,
    getRequestContext,
} from '../utils/request-context.util';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
    private static readonly WARN_SKIP_PATH_PATTERNS = [/^\/uploads\/.+/];

    private readonly logger = new Logger(HttpExceptionFilter.name);
    private readonly isDevelopment = process.env.NODE_ENV === 'development';

    catch(exception: unknown, host: ArgumentsHost) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse<Response>();
        const request = ctx.getRequest<Request>();
        const requestId = ensureRequestId(request, response);

        let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
        let message: string = ErrorMessage.INTERNAL_SERVER_ERROR;
        let errors: Record<string, string[]> | null = null;

        if (exception instanceof HttpException) {
            statusCode = exception.getStatus();
            const exceptionResponse = exception.getResponse();

            if (
                exception instanceof BadRequestException &&
                typeof exceptionResponse === 'object' &&
                'message' in exceptionResponse
            ) {
                const validationErrors = (exceptionResponse as any).errors;
                const msg = (exceptionResponse as any).message;

                if (validationErrors && typeof validationErrors === 'object') {
                    message =
                        typeof msg === 'string'
                            ? msg
                            : ErrorMessage.VALIDATION_FAILED;
                    errors = validationErrors;
                } else if (Array.isArray(msg)) {
                    message = ErrorMessage.VALIDATION_FAILED;
                    errors = this.formatValidationErrors(msg);
                } else {
                    message =
                        typeof msg === 'string'
                            ? msg
                            : ErrorMessage.BAD_REQUEST;
                }
            } else {
                message =
                    typeof exceptionResponse === 'string'
                        ? exceptionResponse
                        : (exceptionResponse as any).message ||
                          ErrorMessage.GENERIC_ERROR;
            }
        } else if (exception instanceof PrismaClientKnownRequestError) {
            switch (exception.code) {
                case PrismaErrorCode.UNIQUE_CONSTRAINT:
                    statusCode = HttpStatus.CONFLICT;
                    message = ErrorMessage.RESOURCE_ALREADY_EXISTS;
                    break;
                case PrismaErrorCode.FOREIGN_KEY_CONSTRAINT:
                    statusCode = HttpStatus.BAD_REQUEST;
                    message = ErrorMessage.RELATED_RESOURCE_NOT_FOUND;
                    break;
                case PrismaErrorCode.RECORD_NOT_FOUND:
                    statusCode = HttpStatus.NOT_FOUND;
                    message = ErrorMessage.RESOURCE_NOT_FOUND;
                    break;
                default:
                    // Falls back to the initialized 500 + generic message.
                    this.logger.error('Unhandled Prisma error:', exception);
                    break;
            }
        } else if (exception instanceof PrismaClientValidationError) {
            // This indicates invalid Prisma usage in server code, so we keep the default 500.
            this.logger.error(
                'Prisma validation error (bug in code):',
                exception.message,
            );
        } else {
            this.logger.error('Unhandled exception:', exception);
        }

        this.logException({
            request,
            requestId,
            statusCode,
            message,
            exception,
        });

        response.status(statusCode).json({
            success: false,
            statusCode,
            message,
            errors,
            requestId,
            timestamp: new Date().toISOString(),
            path: request.url,
        });
    }

    private formatValidationErrors(
        messages: string[],
    ): Record<string, string[]> {
        const errors: Record<string, string[]> = {};
        for (const msg of messages) {
            const field = msg.split(' ')[0];
            if (!errors[field]) errors[field] = [];
            errors[field].push(msg);
        }
        return errors;
    }

    private logException({
        request,
        requestId,
        statusCode,
        message,
        exception,
    }: {
        request: Request;
        requestId: string;
        statusCode: number;
        message: string;
        exception: unknown;
    }) {
        const requestContext = getRequestContext(request, requestId);
        const durationMs = getRequestDurationMs(request);
        const context = formatRequestLogLine({
            statusCode,
            method: request.method,
            url: request.originalUrl || request.url,
            route: getMatchedRoute(request),
            durationMs: durationMs ?? 0,
            userId: requestContext.userId,
            ip: requestContext.ip || requestContext.forwardedFor || requestContext.realIp,
            country: requestContext.country,
            deviceType: requestContext.deviceType,
            requestId,
            userAgent: requestContext.userAgent,
        });

        if (statusCode >= HttpStatus.INTERNAL_SERVER_ERROR) {
            this.logger.error(
                `${context} | ${message}`,
                exception instanceof Error ? exception.stack : undefined,
            );
            return;
        }

        if (this.shouldSkipWarnLog(request, statusCode)) {
            return;
        }

        this.logger.warn(
            `${context} | ${message}`,
        );
    }

    private shouldSkipWarnLog(request: Request, statusCode: number): boolean {
        const path = this.getPathname(request.originalUrl || request.url);
        const isStaleUploadPath =
            statusCode === HttpStatus.NOT_FOUND &&
            HttpExceptionFilter.WARN_SKIP_PATH_PATTERNS.some((pattern) =>
                pattern.test(path),
            );
        const isDevLocalNotFound =
            this.isDevelopment &&
            statusCode === HttpStatus.NOT_FOUND &&
            this.isLocalRequest(request);

        return isStaleUploadPath || isDevLocalNotFound;
    }

    private getPathname(url: string): string {
        return url.split('?')[0];
    }

    private isLocalRequest(request: Request): boolean {
        const candidates = [
            request.hostname,
            request.ip,
            request.headers.host,
            request.headers.origin,
            request.headers.referer,
        ].filter((value): value is string => Boolean(value));

        return candidates.some((value) => this.isLocalHost(value));
    }

    private isLocalHost(value: string): boolean {
        const normalizedValue = value.toLowerCase().trim();
        const localHosts = new Set(['localhost', '127.0.0.1', '::1']);

        if (localHosts.has(normalizedValue)) {
            return true;
        }

        try {
            const hostname = new URL(value).hostname.toLowerCase();
            return localHosts.has(hostname);
        } catch {
            const hostWithoutPort = normalizedValue
                .replace(/^\[/, '')
                .replace(/\](:\d+)?$/, '')
                .split(':')[0];

            return localHosts.has(hostWithoutPort);
        }
    }
}
