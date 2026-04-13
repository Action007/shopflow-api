import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { ProductService } from './product.service';
import { ProductController } from './product.controller';
import { UploadModule } from 'src/upload/upload.module';

@Module({
    imports: [PrismaModule, UploadModule],
    controllers: [ProductController],
    providers: [ProductService],
    exports: [ProductService],
})
export class ProductModule {}
