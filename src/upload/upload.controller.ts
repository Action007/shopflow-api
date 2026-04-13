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
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UploadService } from './upload.service';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';
import { diskStorage } from 'multer';
import {
    BadRequestException,
    UnsupportedMediaTypeException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { extname } from 'path';
import { mkdirSync } from 'fs';
import { ConfigService } from '@nestjs/config';
import { Role } from '@prisma/client';
import { ServiceErrorMessage } from 'src/common/constants/service-error-messages';

const uploadPath = 'uploads';
const allowedMimeTypes = new Set([
    'image/jpeg',
    'image/png',
    'image/webp',
]);
const maxFileSize = 5 * 1024 * 1024;
type UploadedImageFile = {
    originalname: string;
    filename: string;
    mimetype: string;
    size: number;
};

@Controller('uploads')
export class UploadController {
    constructor(
        private readonly uploadService: UploadService,
        private readonly configService: ConfigService,
    ) {
        mkdirSync(uploadPath, { recursive: true });
    }

    @Post('images')
    @UseInterceptors(
        FileInterceptor('file', {
            storage: diskStorage({
                destination: uploadPath,
                filename: (_req, file, callback) => {
                    const uniqueName = `${randomUUID()}${extname(file.originalname).toLowerCase()}`;
                    callback(null, uniqueName);
                },
            }),
            limits: { fileSize: maxFileSize },
            fileFilter: (_req, file, callback) => {
                if (!allowedMimeTypes.has(file.mimetype)) {
                    callback(
                        new UnsupportedMediaTypeException(
                            'Only jpeg, png, and webp images are allowed',
                        ),
                        false,
                    );
                    return;
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
            fileName: upload.fileName,
            originalName: upload.originalName,
            mimeType: upload.mimeType,
            size: upload.size,
            status: upload.status,
            url: upload.url,
        };
    }

    @Delete(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    async deleteUpload(
        @Param('id', ParseUUIDPipe) id: string,
        @CurrentUser() user: { id: string; role: Role },
    ): Promise<void> {
        await this.uploadService.removePendingUpload(id, user.id, user.role);
    }
}
