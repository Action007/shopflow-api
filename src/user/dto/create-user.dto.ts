// create-user.dto.ts
import {
    IsEmail,
    IsNotEmpty,
    IsString,
    Matches,
    MaxLength,
    MinLength,
} from 'class-validator';
import { ValidationMessage } from 'src/common/constants/validation-messages';

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
        @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
            message: ValidationMessage.PASSWORD_COMPLEXITY,
        })
        password: string;
}
