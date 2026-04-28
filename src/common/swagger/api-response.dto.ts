import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OrderStatus, Role, UploadStatus } from '@prisma/client';

export class SuccessEnvelopeDto {
    @ApiProperty({ example: true })
    success: true;

    @ApiProperty({
        example: '2026-04-22T16:17:13.266Z',
        description: 'ISO timestamp when the response was generated',
    })
    timestamp: string;
}

export class EmptySuccessResponseDto extends SuccessEnvelopeDto {}

export class ErrorResponseDto {
    @ApiProperty({ example: false })
    success: false;

    @ApiProperty({ example: 400 })
    statusCode: number;

    @ApiProperty({ example: 'Validation failed' })
    message: string;

    @ApiPropertyOptional({
        example: {
            email: ['email must be an email'],
        },
        nullable: true,
    })
    errors?: Record<string, string[]> | null;

    @ApiProperty({ example: '2026-04-22T16:17:13.266Z' })
    timestamp: string;

    @ApiProperty({ example: '/api/v1/auth/register' })
    path: string;
}

export class PaginationMetaDto {
    @ApiProperty({ example: 1 })
    page: number;

    @ApiProperty({ example: 10 })
    limit: number;

    @ApiProperty({ example: 42 })
    total: number;

    @ApiProperty({ example: 5 })
    totalPages: number;

    @ApiProperty({ example: true })
    hasNextPage: boolean;

    @ApiProperty({ example: false })
    hasPreviousPage: boolean;
}

export class AuthTokensDto {
    @ApiProperty({
        description: 'JWT access token for Authorization: Bearer <token>',
    })
    accessToken: string;

    @ApiProperty({
        description:
            'Refresh token returned in the response body. The client must send it back as a cookie named refresh_token when calling POST /auth/refresh.',
    })
    refreshToken: string;
}

export class UserDto {
    @ApiProperty({ format: 'uuid' })
    id: string;

    @ApiProperty({ example: 'John' })
    firstName: string;

    @ApiProperty({ example: 'Doe' })
    lastName: string;

    @ApiProperty({ example: 'john.doe@example.com' })
    email: string;

    @ApiPropertyOptional({
        example: 'https://shopflow-api-1fl0.onrender.com/uploads/avatar.webp',
        nullable: true,
    })
    profileImageUrl?: string | null;

    @ApiProperty({ enum: Role, example: Role.CUSTOMER })
    role: Role;

    @ApiProperty({ example: '2026-04-13T09:00:00.000Z' })
    createdAt: Date | string;
}

export class CategoryDto {
    @ApiProperty({ format: 'uuid' })
    id: string;

    @ApiProperty()
    name: string;

    @ApiPropertyOptional({ nullable: true })
    description?: string | null;

    @ApiPropertyOptional({ format: 'uuid', nullable: true })
    parentId?: string | null;

    @ApiPropertyOptional({
        type: () => CategoryDto,
        nullable: true,
    })
    parent?: CategoryDto | null;

    @ApiProperty({
        type: () => [CategoryDto],
        example: [],
    })
    children: CategoryDto[];

    @ApiProperty({ example: '2026-04-13T09:00:00.000Z' })
    createdAt: Date | string;

    @ApiProperty({ example: '2026-04-13T09:00:00.000Z' })
    updatedAt: Date | string;
}

export class ProductDto {
    @ApiProperty({ format: 'uuid' })
    id: string;

    @ApiProperty()
    name: string;

    @ApiPropertyOptional({ nullable: true })
    description?: string | null;

    @ApiProperty({ example: '1299.99' })
    price: string;

    @ApiProperty({ example: 7 })
    stockQuantity: number;

    @ApiProperty({ format: 'uuid' })
    categoryId: string;

    @ApiPropertyOptional({
        example: 'https://shopflow-api-1fl0.onrender.com/uploads/macbook.webp',
        nullable: true,
    })
    imageUrl?: string | null;

    @ApiPropertyOptional({
        type: () => CategoryDto,
        nullable: true,
    })
    category?: CategoryDto;

    @ApiProperty({ example: '2026-04-13T09:00:00.000Z' })
    createdAt: Date | string;

    @ApiProperty({ example: '2026-04-13T09:00:00.000Z' })
    updatedAt: Date | string;
}

export class CartItemDto {
    @ApiProperty({ format: 'uuid' })
    id: string;

    @ApiProperty({ format: 'uuid' })
    cartId: string;

    @ApiProperty({ format: 'uuid' })
    productId: string;

    @ApiProperty({ example: 2 })
    quantity: number;

    @ApiProperty({ example: '49.99' })
    priceAtAdd: string;

    @ApiProperty({ type: () => ProductDto })
    product: ProductDto;
}

export class CartDto {
    @ApiProperty({ format: 'uuid' })
    id: string;

    @ApiProperty({ format: 'uuid' })
    userId: string;

    @ApiProperty({ type: () => [CartItemDto] })
    items: CartItemDto[];

    @ApiProperty({ example: '2026-04-13T09:00:00.000Z' })
    createdAt: Date | string;

    @ApiProperty({ example: '2026-04-13T09:00:00.000Z' })
    updatedAt: Date | string;
}

export class OrderUserDto {
    @ApiProperty({ format: 'uuid' })
    id: string;

    @ApiProperty({ example: 'John' })
    firstName: string;

    @ApiProperty({ example: 'Doe' })
    lastName: string;

    @ApiProperty({ example: 'john.doe@example.com' })
    email: string;
}

export class OrderItemDto {
    @ApiProperty({ format: 'uuid' })
    id: string;

    @ApiProperty({ format: 'uuid' })
    orderId: string;

    @ApiProperty({ format: 'uuid' })
    productId: string;

    @ApiProperty({ example: 2 })
    quantity: number;

    @ApiProperty({ example: '49.99' })
    priceAtPurchase: string;

    @ApiProperty()
    productNameAtPurchase: string;

    @ApiPropertyOptional({
        type: () => ProductDto,
        nullable: true,
    })
    product?: ProductDto;
}

export class OrderDto {
    @ApiProperty({ format: 'uuid' })
    id: string;

    @ApiProperty({ example: 'ORD-8F01A7C1-1745338633266' })
    orderNumber: string;

    @ApiProperty({ format: 'uuid' })
    userId: string;

    @ApiProperty({ enum: OrderStatus, example: OrderStatus.PENDING })
    status: OrderStatus;

    @ApiProperty({ example: '149.98' })
    totalAmount: string;

    @ApiProperty()
    shippingAddress: string;

    @ApiPropertyOptional({
        example: '2026-04-13T09:00:00.000Z',
        nullable: true,
    })
    paidAt?: Date | string | null;

    @ApiProperty({ type: () => [OrderItemDto] })
    items: OrderItemDto[];

    @ApiPropertyOptional({
        type: () => OrderUserDto,
        nullable: true,
    })
    user?: OrderUserDto;

    @ApiProperty({ example: '2026-04-13T09:00:00.000Z' })
    createdAt: Date | string;

    @ApiProperty({ example: '2026-04-13T09:00:00.000Z' })
    updatedAt: Date | string;
}

export class WishlistItemDto {
    @ApiProperty({ format: 'uuid' })
    id: string;

    @ApiProperty({ format: 'uuid' })
    wishlistId: string;

    @ApiProperty({ format: 'uuid' })
    productId: string;

    @ApiProperty({ example: '2026-04-13T09:00:00.000Z' })
    createdAt: Date | string;

    @ApiProperty({ type: () => ProductDto })
    product: ProductDto;
}

export class WishlistDto {
    @ApiProperty({ format: 'uuid' })
    id: string;

    @ApiProperty({ format: 'uuid' })
    userId: string;

    @ApiProperty({ type: () => [WishlistItemDto] })
    items: WishlistItemDto[];

    @ApiProperty({ example: '2026-04-13T09:00:00.000Z' })
    createdAt: Date | string;

    @ApiProperty({ example: '2026-04-13T09:00:00.000Z' })
    updatedAt: Date | string;
}

export class UploadDto {
    @ApiProperty({ format: 'uuid' })
    id: string;

    @ApiProperty()
    originalName: string;

    @ApiProperty({
        example: 'image/webp',
    })
    mimeType: string;

    @ApiProperty({ enum: UploadStatus, example: UploadStatus.PENDING })
    status: UploadStatus;

    @ApiProperty({
        example: 'https://shopflow-api-1fl0.onrender.com/uploads/file.webp',
    })
    url: string;
}
