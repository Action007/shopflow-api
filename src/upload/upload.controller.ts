import {
    Controller,
    Delete,
    HttpCode,
    HttpStatus,
    Param,
    ParseUUIDPipe,
    Post,
    UploadedFile,
    UseInterceptors,
    BadRequestException,
    UnsupportedMediaTypeException,
} from '@nestjs/common';
import {
    ApiBearerAuth,
    ApiBody,
    ApiConsumes,
    ApiForbiddenResponse,
    ApiNoContentResponse,
    ApiNotFoundResponse,
    ApiOperation,
    ApiParam,
    ApiTags,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { UploadService } from './upload.service';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';
import { diskStorage } from 'multer';
import { randomUUID } from 'crypto';
import { extname } from 'path';
import { mkdirSync } from 'fs';
import { ConfigService } from '@nestjs/config';
import { Role } from '@prisma/client';
import { ServiceErrorMessage } from 'src/common/constants/service-error-messages';
import { UPLOAD_DIR } from './constants/upload.constants';
import {
    ApiEnvelopeResponse,
    ApiErrorResponse,
} from 'src/common/swagger/api-response.decorators';
import {
    ErrorResponseDto,
    UploadDto,
} from 'src/common/swagger/api-response.dto';

const allowedMimeTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);

const maxFileSize = 5 * 1024 * 1024;

type UploadedImageFile = {
    originalname: string;
    filename: string;
    mimetype: string;
    size: number;
};

@ApiTags('Uploads')
@ApiBearerAuth('access-token')
@Controller('uploads')
export class UploadController {
    constructor(
        private readonly uploadService: UploadService,
        private readonly configService: ConfigService,
    ) {
        mkdirSync(UPLOAD_DIR, { recursive: true });
    }

    @Post('images')
    @ApiOperation({
        summary: 'Upload an image file and create a pending upload record',
    })
    @ApiConsumes('multipart/form-data')
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                file: {
                    type: 'string',
                    format: 'binary',
                    description: 'JPEG, PNG, or WebP image up to 5MB',
                },
            },
            required: ['file'],
        },
    })
    @ApiEnvelopeResponse({
        status: 201,
        description: 'Image uploaded successfully',
        type: UploadDto,
    })
    @ApiErrorResponse(400, 'No file uploaded or file is too large')
    @ApiErrorResponse(415, 'Unsupported file type')
    @UseInterceptors(
        FileInterceptor('file', {
            storage: diskStorage({
                destination: UPLOAD_DIR,
                filename: (_req, file, callback) => {
                    const uniqueName = `${randomUUID()}${extname(file.originalname).toLowerCase()}`;
                    callback(null, uniqueName);
                },
            }),
            limits: { fileSize: maxFileSize },
            fileFilter: (_req, file, callback) => {
                if (!allowedMimeTypes.has(file.mimetype)) {
                    return callback(
                        new UnsupportedMediaTypeException(
                            'Only jpeg, png, webp allowed',
                        ),
                        false,
                    );
                }
                callback(null, true);
            },
        }),
    )
    async uploadImage(
        @UploadedFile() file: UploadedImageFile | undefined,
        @CurrentUser() user: { id: string },
    ) {
        if (!file) {
            throw new BadRequestException(
                ServiceErrorMessage.IMAGE_FILE_REQUIRED,
            );
        }

        const publicUrl = `${this.configService.getOrThrow<string>('APP_BASE_URL')}/uploads/${file.filename}`;

        const upload = await this.uploadService.createImageUpload({
            file,
            uploadedById: user.id,
            publicUrl,
        });

        return {
            id: upload.id,
            originalName: upload.originalName,
            mimeType: upload.mimeType,
            status: upload.status,
            url: upload.url,
        };
    }

    @Delete(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Delete a pending upload by id' })
    @ApiParam({ name: 'id', format: 'uuid' })
    @ApiNoContentResponse({ description: 'Pending upload deleted' })
    @ApiForbiddenResponse({
        description:
            'You can delete only your own uploads unless you are an admin',
        type: ErrorResponseDto,
    })
    @ApiNotFoundResponse({
        description: 'Upload not found',
        type: ErrorResponseDto,
    })
    @ApiErrorResponse(400, 'Only pending uploads can be deleted')
    async deleteUpload(
        @Param('id', ParseUUIDPipe) id: string,
        @CurrentUser() user: { id: string; role: Role },
    ): Promise<void> {
        await this.uploadService.removePendingUpload(id, user.id, user.role);
    }
}
