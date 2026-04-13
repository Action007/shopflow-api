import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { TransformResponseInterceptor } from './common/interceptors/transform-response.interceptor';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { UserModule } from './user/user.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { AuthModule } from './auth/auth.module';
import { CategoryModule } from './category/category.module';
import { ProductModule } from './product/product.module';
import { CartModule } from './cart/cart.module';
import { OrderModule } from './order/order.module';
import { HealthModule } from './health/health.module';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { ConfigModule } from '@nestjs/config';
import { validate } from './config/env.validation';
import { UploadModule } from './upload/upload.module';
import { WishlistModule } from './wishlist/wishlist.module';

@Module({
    imports: [
        PrismaModule,
        UserModule,
        AuthModule,
        CategoryModule,
        ProductModule,
        CartModule,
        OrderModule,
        HealthModule,
        UploadModule,
        WishlistModule,
        ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
        ConfigModule.forRoot({
            isGlobal: true,
            validate,
        }),
    ],
    controllers: [],
    providers: [
        {
            provide: APP_FILTER,
            useClass: HttpExceptionFilter,
        },
        {
            provide: APP_INTERCEPTOR,
            useClass: TransformResponseInterceptor,
        },
        {
            provide: APP_INTERCEPTOR,
            useClass: LoggingInterceptor,
        },
        {
            provide: APP_GUARD,
            useClass: JwtAuthGuard,
        },
        { provide: APP_GUARD, useClass: ThrottlerGuard },
    ],
})
export class AppModule {}
