import { Transform, plainToInstance } from 'class-transformer';
import {
    IsBoolean,
    IsEnum,
    IsInt,
    IsNotEmpty,
    IsString,
    Min,
    MinLength,
    validateSync,
} from 'class-validator';

enum Environment {
    Development = 'development',
    Production = 'production',
    Test = 'test',
}

function toBoolean(value: unknown): boolean {
    return value === true || value === 'true';
}

class EnvironmentVariables {
    @IsEnum(Environment)
    NODE_ENV: Environment = Environment.Development;

    @IsString()
    @IsNotEmpty()
    DATABASE_URL: string;

    @IsString()
    @MinLength(32, { message: 'JWT_SECRET must be at least 32 characters' })
    JWT_SECRET: string;

    @IsString()
    @IsNotEmpty()
    APP_BASE_URL: string;

    @IsInt()
    @Min(60)
    JWT_ACCESS_EXPIRATION: number = 3600;

    @IsInt()
    @Min(3600)
    JWT_REFRESH_EXPIRATION: number = 604800;

    @IsInt()
    @Min(1)
    PORT: number = 3000;

    @IsString()
    @IsNotEmpty()
    CORS_ORIGINS: string;

    @Transform(({ value }) => toBoolean(value))
    @IsBoolean()
    TRUST_PROXY: boolean = false;

    @IsString()
    @IsNotEmpty()
    UPLOAD_DIR: string = 'uploads';
}

export function validate(config: Record<string, unknown>) {
    const validated = plainToInstance(EnvironmentVariables, config, {
        enableImplicitConversion: true,
    });

    const errors = validateSync(validated, { skipMissingProperties: false });

    if (errors.length > 0) {
        throw new Error(`Config validation failed:\n${errors.toString()}`);
    }

    return validated;
}
