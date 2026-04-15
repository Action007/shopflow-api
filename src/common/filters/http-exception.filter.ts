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

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
    private readonly logger = new Logger(HttpExceptionFilter.name);
    private readonly isDevelopment = process.env.NODE_ENV === 'development';

    catch(exception: unknown, host: ArgumentsHost) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse<Response>();
        const request = ctx.getRequest<Request>();

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
                const msg = (exceptionResponse as any).message;
                if (Array.isArray(msg)) {
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
                    this.logger.error('Unhandled Prisma error:', exception);
            }
        } else if (exception instanceof PrismaClientValidationError) {
            this.logger.error(
                'Prisma validation error (bug in code):',
                exception.message,
            );
        } else {
            this.logger.error('Unhandled exception:', exception);
        }

        this.logException({
            request,
            statusCode,
            message,
            exception,
        });

        response.status(statusCode).json({
            success: false,
            statusCode,
            message,
            errors,
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
        statusCode,
        message,
        exception,
    }: {
        request: Request;
        statusCode: number;
        message: string;
        exception: unknown;
    }) {
        const context = `${request.method} ${request.url} -> ${statusCode}`;

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

        this.logger.warn(`${context} | ${message}`);
    }

    private shouldSkipWarnLog(request: Request, statusCode: number): boolean {
        return (
            this.isDevelopment &&
            statusCode === HttpStatus.NOT_FOUND &&
            this.isLocalRequest(request)
        );
    }

    private isLocalRequest(request: Request): boolean {
        const candidates = [
            request.hostname,
            request.ip,
            request.headers.host,
            request.headers.origin,
            request.headers.referer,
        ].filter((value): value is string => Boolean(value));

        return candidates.some((value) =>
            ['localhost', '127.0.0.1', '::1'].some((localHost) =>
                value.toLowerCase().includes(localHost),
            ),
        );
    }
}
