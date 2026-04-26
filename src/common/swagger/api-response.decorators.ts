import { HttpStatus, Type, applyDecorators } from '@nestjs/common';
import { ApiExtraModels, ApiResponse, getSchemaPath } from '@nestjs/swagger';
import {
    EmptySuccessResponseDto,
    ErrorResponseDto,
    PaginationMetaDto,
    SuccessEnvelopeDto,
} from './api-response.dto';

type EnvelopeOptions = {
    status?: number;
    description: string;
    type?: Type<unknown>;
    isArray?: boolean;
    paginated?: boolean;
};

export function ApiEnvelopeResponse(options: EnvelopeOptions) {
    const {
        status = HttpStatus.OK,
        description,
        type,
        isArray,
        paginated,
    } = options;

    if (!type) {
        return applyDecorators(
            ApiExtraModels(EmptySuccessResponseDto),
            ApiResponse({
                status,
                description,
                type: EmptySuccessResponseDto,
            }),
        );
    }

    const dataSchema = paginated
        ? {
              type: 'object',
              properties: {
                  items: {
                      type: 'array',
                      items: { $ref: getSchemaPath(type) },
                  },
                  meta: { $ref: getSchemaPath(PaginationMetaDto) },
              },
              required: ['items', 'meta'],
          }
        : isArray
          ? {
                type: 'array',
                items: { $ref: getSchemaPath(type) },
            }
          : { $ref: getSchemaPath(type) };

    const extraModels = paginated
        ? [SuccessEnvelopeDto, PaginationMetaDto, type]
        : [SuccessEnvelopeDto, type];

    return applyDecorators(
        ApiExtraModels(...extraModels),
        ApiResponse({
            status,
            description,
            schema: {
                allOf: [
                    { $ref: getSchemaPath(SuccessEnvelopeDto) },
                    {
                        type: 'object',
                        properties: {
                            data: dataSchema,
                        },
                        required: ['success', 'timestamp', 'data'],
                    },
                ],
            },
        }),
    );
}

export function ApiErrorResponse(status: number, description: string) {
    return applyDecorators(
        ApiResponse({
            status,
            description,
            type: ErrorResponseDto,
        }),
    );
}
