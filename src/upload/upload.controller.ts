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
    ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { UploadService } from './upload.service';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';
import { ConfigService } from '@nestjs/config';
import { Role } from '@prisma/client';
import { ServiceErrorMessage } from 'src/common/constants/service-error-messages';
import {
    ApiEnvelopeResponse,
    ApiErrorResponse,
} from 'src/common/swagger/api-response.decorators';
import {
    ErrorResponseDto,
    UploadDto,
} from 'src/common/swagger/api-response.dto';

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
    ) {}

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
    @ApiUnauthorizedResponse({
        description: 'Missing or invalid access token',
        type: ErrorResponseDto,
    })
    @UseInterceptors(FileInterceptor('file'))
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
    @ApiUnauthorizedResponse({
        description: 'Missing or invalid access token',
        type: ErrorResponseDto,
    })
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
