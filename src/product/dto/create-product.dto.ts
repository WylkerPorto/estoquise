import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsNumber,
  IsString,
  Min,
  MinLength,
} from 'class-validator';

export class CreateProductDto {
  @ApiProperty({
    description: 'Nome do produto',
    example: 'Camiseta Polo',
    minLength: 5,
  })
  @IsNotEmpty()
  @IsString()
  @MinLength(5)
  name: string;

  @ApiProperty({
    description: 'Preço do produto',
    example: 99.99,
  })
  @IsNotEmpty()
  @IsNumber()
  @Min(0.5)
  price: number;

  @ApiProperty({
    description: 'Quantidade em estoque do produto',
    example: 10,
  })
  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  quantity: number;

  @ApiProperty({
    description: 'Descrição do produto',
    example: 'Camiseta polo de algodão, tamanho M, cor azul.',
  })
  @IsString()
  @MinLength(5)
  obs?: string;
}
