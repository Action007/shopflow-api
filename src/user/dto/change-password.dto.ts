import { IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ValidationMessage } from 'src/common/constants/validation-messages';

export class ChangePasswordDto {
    @ApiProperty({ example: 'StrongPass1!' })
    @IsString()
    currentPassword: string;

    @ApiProperty({
        example: 'NewStrongPass2!',
        minLength: 8,
        maxLength: 128,
    })
    @IsString()
    @MinLength(8)
    @MaxLength(128)
    @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*])/, {
        message: ValidationMessage.PASSWORD_COMPLEXITY,
    })
    newPassword: string;
}
