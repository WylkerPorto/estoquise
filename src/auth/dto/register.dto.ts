import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsString, MinLength } from 'class-validator';
import { Role } from '../enums/role.enum';

export class RegisterDto {
  @ApiProperty({
    description: 'Nome do usuário',
    example: 'Felipe',
    minLength: 5,
  })
  @IsString()
  @MinLength(5)
  name: string;

  @ApiProperty({
    description: 'Login do usuário',
    example: 'admin123',
    minLength: 5,
  })
  @IsString()
  @MinLength(5)
  login: string;

  @ApiProperty({
    description: 'Senha do usuário',
    example: '123456',
    minLength: 6,
  })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiProperty({
    description: 'Regra de acesso do usuário',
    example: Role.CAIXA,
    enum: Role,
  })
  @IsEnum(Role)
  role: Role;
}
