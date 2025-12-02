import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Movement } from '../../src/common/enums/movement.enum';
import { CreateInboundDto } from './dto/create-inbound.dto';
import { UpdateInboundDto } from './dto/update-inbound.dto';

@Injectable()
export class InboundService {
  constructor(private readonly prisma: PrismaService) {}
  async create(userId: number, createInboundDto: CreateInboundDto) {
    return await this.prisma.movement.create({
      data: {
        userId,
        type: Movement.ENTRY,
        movementItems: createInboundDto.movementItems,
      },
      include: {
        movementItems: true,
      },
    });
  }

  async findAll(page: number, limit: number) {
    const skip = (page - 1) * limit;

    const [items, total] = await this.prisma.$transaction([
      this.prisma.movement.findMany({
        where: { type: Movement.ENTRY },
        skip,
        take: limit,
        orderBy: { id: 'desc' },
        include: {
          movementItems: true,
        },
      }),
      this.prisma.movement.count({ where: { type: Movement.ENTRY } }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      lastPage: Math.ceil(total / limit),
    };
  }

  async findOne(id: number) {
    const inbound = await this.prisma.movement.findUnique({
      where: { id, type: Movement.ENTRY },
      include: {
        movementItems: true,
      },
    });

    if (!inbound) {
      throw new NotFoundException('Entrada não encontrada');
    }

    return inbound;
  }

  async update(id: number, updateInboundDto: UpdateInboundDto) {
    const dataToUpdate: any = {};

    if (updateInboundDto.movementItems) {
      dataToUpdate.movementItems = {
        // remove itens antigos e recria os novos (substituição completa)
        deleteMany: {},
        create: updateInboundDto.movementItems.map((mi) => ({
          productId: mi.productId,
          quantity: mi.quantity,
          price: mi.price,
        })),
      };
    }

    try {
      return await this.prisma.movement.update({
        where: { id },
        data: dataToUpdate,
        include: { movementItems: true },
      });
    } catch (err) {
      if (err.code === 'P2025') {
        throw new NotFoundException('Entrada não encontrada');
      }

      throw err;
    }
  }

  async remove(id: number) {
    try {
      return await this.prisma.movement.delete({ where: { id } });
    } catch (err) {
      if (err.code === 'P2025') {
        throw new NotFoundException('Entrada não encontrada');
      }

      throw err;
    }
  }
}
