import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createUserDto: CreateUserDto) {
    const userAlreadyExist = await this.prisma.user.findUnique({
      where: { login: createUserDto.login },
    });

    if (userAlreadyExist) {
      throw new ConflictException('Usuário já cadastrado');
    }

    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);

    await this.prisma.user.create({
      data: {
        ...createUserDto,
        password: hashedPassword,
      },
    });

    return { ok: true };
  }

  async findAll(page: number, limit: number) {
    const skip = (page - 1) * limit;

    const [items, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        skip,
        take: limit,
        orderBy: { id: 'asc' },
      }),
      this.prisma.user.count(),
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
    const user = await this.prisma.user.findUnique({ where: { id } });

    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    return user;
  }

  async update(id: number, updateUserDto: UpdateUserDto) {
    const dataToUpdate = { ...updateUserDto };

    if (updateUserDto.password) {
      dataToUpdate.password = await bcrypt.hash(updateUserDto.password, 10);
    }

    try {
      return await this.prisma.user.update({
        where: { id },
        data: dataToUpdate,
      });
    } catch (err) {
      if (err.code === 'P2025') {
        throw new NotFoundException('Usuário não encontrado');
      }

      throw err;
    }
  }

  async remove(id: number) {
    try {
      return await this.prisma.user.delete({ where: { id } });
    } catch (err) {
      if (err.code === 'P2025') {
        throw new NotFoundException('Usuário não encontrado');
      }

      throw err;
    }
  }
}
