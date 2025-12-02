import { Injectable } from '@nestjs/common';
import { CreateOutboundDto } from './dto/create-outbound.dto';
import { UpdateOutboundDto } from './dto/update-outbound.dto';

@Injectable()
export class OutboundService {
  create(createOutboundDto: CreateOutboundDto) {
    return 'This action adds a new outbound';
  }

  findAll() {
    return `This action returns all outbound`;
  }

  findOne(id: number) {
    return `This action returns a #${id} outbound`;
  }

  update(id: number, updateOutboundDto: UpdateOutboundDto) {
    return `This action updates a #${id} outbound`;
  }

  remove(id: number) {
    return `This action removes a #${id} outbound`;
  }
}
