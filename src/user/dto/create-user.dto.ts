import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsString, MinLength } from 'class-validator';
import { Role } from '../../common/enums/role.enum';

export class CreateUserDto {
  @ApiProperty({
    description: 'Nome completo do usuário',
    example: 'João Silva',
    minLength: 5,
  })
  @IsNotEmpty()
  @IsString()
  @MinLength(5)
  name: string;

  @ApiProperty({
    description: 'Login do usuário',
    example: 'admin123',
    minLength: 5,
  })
  @IsNotEmpty()
  @IsString()
  @MinLength(5)
  login: string;

  @ApiProperty({
    description: 'Senha do usuário',
    example: '123456',
    minLength: 6,
  })
  @IsNotEmpty()
  @IsString()
  @MinLength(6)
  password: string;

  @ApiProperty({
    description: 'Regra de acesso do usuário',
    example: Role.CAIXA,
    enum: Role,
  })
  @IsNotEmpty()
  @IsEnum(Role)
  role: Role;
}
