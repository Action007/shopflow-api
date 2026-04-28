import { mkdirSync } from 'fs';
import { randomUUID } from 'crypto';
import { extname } from 'path';
import { Module, UnsupportedMediaTypeException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MulterModule } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { PrismaModule } from 'src/prisma/prisma.module';
import { UploadController } from './upload.controller';
import { UploadService } from './upload.service';
import { getUploadDirPath } from './constants/upload.constants';

const allowedMimeTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);
const maxFileSize = 5 * 1024 * 1024;

@Module({
    imports: [
        PrismaModule,
        MulterModule.registerAsync({
            inject: [ConfigService],
            useFactory: (configService: ConfigService) => ({
                storage: diskStorage({
                    destination: (_req, _file, callback) => {
                        const uploadDir = getUploadDirPath(
                            configService.getOrThrow<string>('UPLOAD_DIR'),
                        );
                        mkdirSync(uploadDir, { recursive: true });
                        callback(null, uploadDir);
                    },
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
        }),
    ],
    controllers: [UploadController],
    providers: [UploadService],
    exports: [UploadService],
})
export class UploadModule {}
