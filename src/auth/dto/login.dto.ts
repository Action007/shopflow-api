import { IsEmail, IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
    @ApiProperty({ example: 'viktor@example.com' })
    @IsEmail()
    email: string;

    @ApiProperty({ example: 'StrongPass1!' })
    @IsString()
    @IsNotEmpty()
    password: string;
}
