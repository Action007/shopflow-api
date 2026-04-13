import { IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { ValidationMessage } from 'src/common/constants/validation-messages';

export class ChangePasswordDto {
    @IsString()
    currentPassword: string;

    @IsString()
    @MinLength(8)
    @MaxLength(128)
    @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*])/, {
        message: ValidationMessage.PASSWORD_COMPLEXITY,
    })
    newPassword: string;
}
