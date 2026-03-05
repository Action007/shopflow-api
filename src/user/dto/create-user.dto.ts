// create-user.dto.ts
import {
    IsEmail,
    IsNotEmpty,
    IsString,
    MaxLength,
    MinLength,
} from 'class-validator';

export class CreateUserDto {
        @IsString()
        @IsNotEmpty()
        @MaxLength(50)
        firstName: string;

        @IsString()
        @IsNotEmpty()
        @MaxLength(50)
        lastName: string;

        @IsEmail()
        email: string;

        @IsString()
        @MinLength(8)
        password: string;
}
