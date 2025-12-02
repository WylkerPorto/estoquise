import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { OutboundService } from './outbound.service';
import { CreateOutboundDto } from './dto/create-outbound.dto';
import { UpdateOutboundDto } from './dto/update-outbound.dto';

@Controller('outbound')
export class OutboundController {
  constructor(private readonly outboundService: OutboundService) {}

  @Post()
  create(@Body() createOutboundDto: CreateOutboundDto) {
    return this.outboundService.create(createOutboundDto);
  }

  @Get()
  findAll() {
    return this.outboundService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.outboundService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateOutboundDto: UpdateOutboundDto) {
    return this.outboundService.update(+id, updateOutboundDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.outboundService.remove(+id);
  }
}
