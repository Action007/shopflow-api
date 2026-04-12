// create-user.dto.ts
import {
    IsEmail,
    IsNotEmpty,
    IsString,
    Matches,
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
        @MaxLength(128)
        @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*])/, {
            message:
                'password must contain at least 1 uppercase, 1 lowercase, 1 number, and 1 special character',
        })
        password: string;
}
