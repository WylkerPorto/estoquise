import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Injectable()
export class ProductService {
  constructor(private readonly prisma: PrismaService) {}
  async create(createProductDto: CreateProductDto) {
    const productExists = await this.prisma.product.findUnique({
      where: { name: createProductDto.name },
    });

    if (productExists) {
      throw new ConflictException('Produto já cadastrado');
    }

    await this.prisma.product.create({
      data: {
        ...createProductDto,
      },
    });

    return { ok: true };
  }

  async findAll(page: number, limit: number) {
    const skip = (page - 1) * limit;
    const [items, total] = await this.prisma.$transaction([
      this.prisma.product.findMany({
        skip,
        take: limit,
        orderBy: { id: 'asc' },
      }),
      this.prisma.product.count(),
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
    const product = await this.prisma.product.findUnique({ where: { id } });

    if (!product) {
      throw new NotFoundException('Produto não encontrado');
    }

    return product;
  }

  async update(id: number, updateProductDto: UpdateProductDto) {
    try {
      return await this.prisma.product.update({
        where: { id },
        data: { ...updateProductDto },
      });
    } catch (err) {
      throw new NotFoundException('Produto não encontrado');
    }
  }

  async remove(id: number) {
    try {
      return await this.prisma.product.delete({ where: { id } });
    } catch (err) {
      throw new NotFoundException('Produto não encontrado');
    }
  }
}
