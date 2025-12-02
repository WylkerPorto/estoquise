import { ApiProperty } from '@nestjs/swagger';
import { ValidateNested, IsNotEmpty } from 'class-validator';
import { MovementItemDto } from '../../common/dtos/movement-item.dto';
import { Type } from 'class-transformer';

export class CreateInboundDto {
  @ApiProperty({
    description: 'Itens da entrada',
    type: [MovementItemDto],
  })
  @IsNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => MovementItemDto)
  movementItems: MovementItemDto[];
}
