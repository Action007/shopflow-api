export const ErrorMessage = {
    INTERNAL_SERVER_ERROR: 'Internal server error',
    VALIDATION_FAILED: 'Validation failed',
    BAD_REQUEST: 'Bad request',
    GENERIC_ERROR: 'Error',

    // Prisma-mapped (user-facing)
    RESOURCE_ALREADY_EXISTS: 'Resource already exists',
    RELATED_RESOURCE_NOT_FOUND: 'Related resource not found',
    RESOURCE_NOT_FOUND: 'Resource not found',
} as const;
