// src/common/filters/http-exception.filter.ts

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
import { PrismaClientKnownRequestError, PrismaClientValidationError } from '@prisma/client/runtime/library';

// @Catch() with no argument = catches EVERYTHING
// Spring equivalent: @RestControllerAdvice with @ExceptionHandler(Exception.class)
// The difference: Spring uses separate methods per exception type,
// NestJS uses one catch() method with instanceof checks
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
    // NestJS built-in logger — better than raw console.log
    // Adds class name prefix, timestamps, and respects log level config
    private readonly logger = new Logger(HttpExceptionFilter.name);

    catch(exception: unknown, host: ArgumentsHost) {
        // ArgumentsHost is NestJS's abstraction over the request context
        // switchToHttp() gives you the Express req/res objects
        // Spring equivalent: WebRequest + HttpServletResponse parameters in your handler methods
        const ctx = host.switchToHttp();
        const response = ctx.getResponse<Response>();
        const request = ctx.getRequest<Request>();

        let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
        let message: string = ErrorMessage.INTERNAL_SERVER_ERROR;
        let errors: Record<string, string[]> | null = null;

        // --- Branch 1: NestJS HttpException and its subclasses ---
        // This single check covers: NotFoundException, BadRequestException,
        // ForbiddenException, ConflictException, UnauthorizedException, etc.
        // Spring equivalent: you wrote separate @ExceptionHandler for each —
        // here they're all HttpException subclasses with different status codes,
        // so one instanceof check + getStatus() handles them all
        if (exception instanceof HttpException) {
            statusCode = exception.getStatus();
            // getResponse() returns what was passed to the exception constructor
            // Could be a string: throw new NotFoundException('User not found')
            // Could be an object: ValidationPipe passes { message: [...], error: '...' }
            const exceptionResponse = exception.getResponse();

            // --- Branch 2: Validation errors from ValidationPipe ---
            // When ValidationPipe rejects input, it throws BadRequestException
            // with response.message as an array of error strings
            // Spring equivalent: your handleValidationErrors() for MethodArgumentNotValidException
            if (
                exception instanceof BadRequestException &&
                typeof exceptionResponse === 'object' &&
                'message' in exceptionResponse
            ) {
                const msg = (exceptionResponse as any).message;
                if (Array.isArray(msg)) {
                    // ValidationPipe sends: ["email must be an email", "password must be longer..."]
                    // We transform to: { email: [...], password: [...] } for frontend consumption
                    message = ErrorMessage.VALIDATION_FAILED;
                    errors = this.formatValidationErrors(msg);
                } else {
                    // Non-validation BadRequestException: throw new BadRequestException('Cart is empty')
                    message =
                        typeof msg === 'string'
                            ? msg
                            : ErrorMessage.BAD_REQUEST;
                }
            } else {
                // All other HttpExceptions (NotFoundException, ForbiddenException, etc.)
                // Just extract the message — status code already set by getStatus()
                message =
                    typeof exceptionResponse === 'string'
                        ? exceptionResponse
                        : (exceptionResponse as any).message ||
                          ErrorMessage.GENERIC_ERROR;
            }

            // --- Branch 3: Prisma known errors ---
            // Unlike Spring/Hibernate which throws different exception classes
            // (DataIntegrityViolationException, EntityNotFoundException, etc.),
            // Prisma throws ONE type with error codes. You switch on the code.
        } else if (exception instanceof PrismaClientKnownRequestError) {
            switch (exception.code) {
                case PrismaErrorCode.UNIQUE_CONSTRAINT:
                    // Duplicate email, duplicate order number, etc.
                    // Spring equivalent: your handleDuplicateResource()
                    statusCode = HttpStatus.CONFLICT;
                    message = ErrorMessage.RESOURCE_ALREADY_EXISTS;
                    break;
                case PrismaErrorCode.FOREIGN_KEY_CONSTRAINT:
                    // Invalid categoryId, invalid userId reference, etc.
                    // No direct Spring equivalent — JPA usually catches this earlier
                    statusCode = HttpStatus.BAD_REQUEST;
                    message = ErrorMessage.RELATED_RESOURCE_NOT_FOUND;
                    break;
                case PrismaErrorCode.RECORD_NOT_FOUND:
                    // Prisma update/delete on non-existent record
                    // Spring equivalent: your handleResourceNotFound()
                    statusCode = HttpStatus.NOT_FOUND;
                    message = ErrorMessage.RESOURCE_NOT_FOUND;
                    break;
                default:
                    // Prisma error code we haven't mapped — log it, return 500
                    this.logger.error('Unhandled Prisma error:', exception);
            }

            // --- Branch 4: Prisma validation errors ---
            // This fires when YOUR code builds a malformed Prisma query
            // e.g., wrong field name, wrong type passed to where clause
            // This is a BUG in your code, not a user error
            // Always 500 — user sees generic message, you see the full error in logs
        } else if (exception instanceof PrismaClientValidationError) {
            this.logger.error(
                'Prisma validation error (bug in code):',
                exception.message,
            );

            // --- Branch 5: Catch-all ---
            // Anything not caught above: TypeError, RangeError, third-party lib errors, etc.
            // Spring equivalent: your handleGlobalException() with @ExceptionHandler(Exception.class)
        } else {
            this.logger.error('Unhandled exception:', exception);
        }

        // Build and send the response — this is your stable contract
        // Spring equivalent: ResponseEntity<ErrorResponse> with your ErrorResponse builder
        // Every error response in your API has this exact shape — no exceptions
        response.status(statusCode).json({
            success: false,
            statusCode,
            message,
            errors,
            timestamp: new Date().toISOString(),
            path: request.url,
        });
    }

    // Transforms flat validation message array into grouped-by-field object
    // Input:  ["email must be an email", "email should not be empty", "password must be longer..."]
    // Output: { email: ["email must be an email", "email should not be empty"], password: ["password must be..."] }
    // Note: This relies on class-validator's default message format where the field name is the first word.
    // If you use custom messages that don't start with the field name, this grouping won't work correctly.
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
}
