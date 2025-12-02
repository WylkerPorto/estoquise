import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsPositive, IsNumber, IsNotEmpty } from 'class-validator';

export class MovementItemDto {
  @ApiProperty({
    description: 'Id do produto',
    example: 1,
  })
  @IsInt()
  @IsNotEmpty()
  productId: number;

  @ApiProperty({
    description: 'Quantidade do produto',
    example: 10,
  })
  @IsInt()
  @IsPositive()
  @IsNotEmpty()
  quantity: number;

  @ApiProperty({
    description: 'Preço do produto',
    example: 99.99,
  })
  @IsNumber()
  @IsPositive()
  @IsNotEmpty()
  price: number;
}
