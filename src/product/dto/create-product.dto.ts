import { IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, Matches, Min } from "class-validator";

export class CreateProductDto {
    @IsString()
    @IsNotEmpty()
    name: string;

    @IsOptional()
    @IsString()
    description?: string;

    @IsString()
    @Matches(/^\d+(\.\d{1,2})?$/, {
        message:
            'price must be a valid decimal with up to 2 decimal places (e.g. "29.99")',
    })
    price: string;

    @IsInt()
    @Min(0)
    stockQuantity: number;

    @IsUUID()
    categoryId: string;
}
