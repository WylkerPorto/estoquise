import { Test, TestingModule } from '@nestjs/testing';
import { UserService } from './user.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

// Mocks
prismaMock = {
  user: {
    findMany: jest.fn(),
    count: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  $transaction: jest.fn((queries) => {
    return Promise.all(queries);
  }),
};

const jwtServiceMock = {
  sign: jest.fn(),
};

jest.mock('bcrypt', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

describe('UserService', () => {
  let service: UserService;
  let prisma: typeof prismaMock;
  let jwtService: typeof jwtServiceMock;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
        {
          provide: JwtService,
          useValue: jwtServiceMock,
        },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
    prisma = module.get<PrismaService>(PrismaService);
    jwtService = module.get<JwtService>(JwtService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('Create', () => {
    it('Can return error if user already exists', async () => {
      const dto = {
        login: 'admin',
        password: 'hashed_password',
        name: 'Administrador',
        role: 'ADMIN',
      };

      prisma.user.findUnique.mockResolvedValue({
        id: 1,
        login: 'admin',
        password: 'hashed_password',
        name: 'Administrador',
        role: 'ADMIN',
      });

      await expect(service.create(dto)).rejects.toThrow(ConflictException);
    });

    it('should create user and return ok', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue({ id: 1 });

      const dto = {
        login: 'admin',
        password: 'hashed_password',
        name: 'Administrador',
        role: 'NEW',
      };

      await expect(service.create(dto)).resolves.toEqual({ ok: true });
      expect(prisma.user.create).toHaveBeenCalled();
    });

    it('should hash password before saving user', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue({ id: 1 });

      // mock do hash
      const hashed = 'hashed_pw_123';
      (bcrypt.hash as jest.Mock).mockResolvedValue(hashed);

      const dto = {
        login: 'admin',
        password: '1234',
        name: 'Administrador',
        role: 'NEW',
      };

      await service.create(dto);

      // 1) bcrypt.hash deve ser chamado com a senha original
      expect(bcrypt.hash).toHaveBeenCalledWith('1234', expect.any(Number));

      // 2) user.create deve receber a senha hasheada
      expect(prisma.user.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          password: hashed, // senha HASHEADA
        }),
      });

      // 3) Garantir que NÃO foi usada a senha original
      expect(prisma.user.create).not.toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            password: '1234',
          }),
        }),
      );
    });

    it('should save user with role ADMIN', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      const hashed = 'hashed_pw_123';
      (bcrypt.hash as jest.Mock).mockResolvedValue(hashed);

      const dto = {
        login: 'admin',
        password: '123456',
        name: 'Administrador',
        role: 'ADMIN',
      };

      await service.create(dto);

      expect(prisma.user.create).toHaveBeenCalledWith({
        data: {
          ...dto,
          password: hashed,
          role: 'ADMIN', // <- AQUI que testamos!
        },
      });
    });

    it('should hash the password using bcrypt with salt rounds = 10', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      const hashed = 'hashed_pw_anything';
      (bcrypt.hash as jest.Mock).mockResolvedValue(hashed);

      prisma.user.create.mockResolvedValue({ id: 1 });

      const dto = {
        login: 'newuser',
        password: 'mypassword',
        name: 'User Teste',
        role: 'NEW',
      };

      const result = await service.create(dto);

      expect(bcrypt.hash).toHaveBeenCalledWith('mypassword', 10); // <— valida rounds

      expect(prisma.user.create).toHaveBeenCalledWith({
        data: {
          login: 'newuser',
          password: hashed,
          name: 'User Teste',
          role: 'NEW',
        },
      });

      expect(result).toEqual({ ok: true });
    });
  });

  describe('Update', () => {
    it('should update user with only name', async () => {
      const userId = 1;
      const updateDto = { name: 'Novo Nome' };

      prisma.user.update.mockResolvedValue({
        id: userId,
        login: 'admin',
        password: 'hashed_password',
        name: 'Novo Nome',
        role: 'ADMIN',
      });

      const result = await service.update(userId, updateDto);

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: updateDto,
      });
      expect(result).toEqual({
        id: userId,
        login: 'admin',
        password: 'hashed_password',
        name: 'Novo Nome',
        role: 'ADMIN',
      });
    });

    it('should update user with only login', async () => {
      const userId = 2;
      const updateDto = { login: 'novologin' };

      prisma.user.update.mockResolvedValue({
        id: userId,
        login: 'novologin',
        password: 'hashed_password',
        name: 'User Name',
        role: 'NEW',
      });

      const result = await service.update(userId, updateDto);

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: updateDto,
      });
      expect(result).toEqual({
        id: userId,
        login: 'novologin',
        password: 'hashed_password',
        name: 'User Name',
        role: 'NEW',
      });
    });

    it('should hash password when updating password field', async () => {
      const userId = 1;
      const hashed = 'hashed_new_pw_123';
      (bcrypt.hash as jest.Mock).mockResolvedValue(hashed);

      prisma.user.update.mockResolvedValue({
        id: userId,
        login: 'admin',
        password: hashed,
        name: 'Administrador',
        role: 'ADMIN',
      });

      const updateDto = { password: 'newpassword123' };

      await service.update(userId, updateDto);

      // 1) bcrypt.hash deve ser chamado com a nova senha
      expect(bcrypt.hash).toHaveBeenCalledWith('newpassword123', 10);

      // 2) user.update deve receber a senha hasheada
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: { password: hashed },
      });

      // 3) Garantir que NÃO foi usada a senha original
      expect(prisma.user.update).not.toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            password: 'newpassword123',
          }),
        }),
      );
    });

    it('should update multiple fields at once', async () => {
      const userId = 1;
      const hashed = 'hashed_updated_pw';
      (bcrypt.hash as jest.Mock).mockResolvedValue(hashed);

      prisma.user.update.mockResolvedValue({
        id: userId,
        login: 'novologin',
        password: hashed,
        name: 'Novo Nome Completo',
        role: 'ADMIN',
      });

      const updateDto = {
        login: 'novologin',
        password: 'senhaatualizada',
        name: 'Novo Nome Completo',
      };

      await service.update(userId, updateDto);

      expect(bcrypt.hash).toHaveBeenCalledWith('senhaatualizada', 10);
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: {
          login: 'novologin',
          password: hashed,
          name: 'Novo Nome Completo',
        },
      });
    });

    it('should update user with empty object (no changes)', async () => {
      const userId = 1;
      const updateDto = {};

      prisma.user.update.mockResolvedValue({
        id: userId,
        login: 'admin',
        password: 'hashed_password',
        name: 'Administrador',
        role: 'ADMIN',
      });

      const result = await service.update(userId, updateDto);

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: updateDto,
      });
      expect(result).toBeDefined();
    });

    it('should hash password using bcrypt with salt rounds = 10 on update', async () => {
      const userId = 1;
      const hashed = 'hashed_pw_updated';
      (bcrypt.hash as jest.Mock).mockResolvedValue(hashed);

      prisma.user.update.mockResolvedValue({
        id: userId,
        login: 'admin',
        password: hashed,
        name: 'Administrador',
        role: 'ADMIN',
      });

      const updateDto = { password: 'mynewerpassword' };

      await service.update(userId, updateDto);

      expect(bcrypt.hash).toHaveBeenCalledWith('mynewerpassword', 10);
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: { password: hashed },
      });
    });

    it('should not call bcrypt.hash when password is not in update', async () => {
      const userId = 1;

      prisma.user.update.mockResolvedValue({
        id: userId,
        login: 'newlogin',
        password: 'hashed_password',
        name: 'Administrador',
        role: 'ADMIN',
      });

      const updateDto = { login: 'newlogin', name: 'Administrador' };

      await service.update(userId, updateDto);

      expect(bcrypt.hash).not.toHaveBeenCalled();
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: updateDto,
      });
    });

    it('should throw NotFoundException if user is not found', async () => {
      const updateDto = { name: 'Nome Inexistente' };

      prisma.user.update.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('User not found', {
          code: 'P2025',
          clientVersion: '4.0.0',
        }),
      );

      await expect(service.update(999, updateDto)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('FindAll', () => {
    it('should return list of users on findAll', async () => {
      const users = [
        { id: 1, login: 'u1', password: 'h1', name: 'User 1', role: 'NEW' },
        { id: 2, login: 'u2', password: 'h2', name: 'User 2', role: 'ADMIN' },
      ];

      prisma.user.findMany.mockResolvedValue(users);

      const result = await service.findAll();

      expect(prisma.user.findMany).toHaveBeenCalled();
      expect(result.items).toEqual(users);
    });

    it('should return empty array when no users', async () => {
      prisma.user.findMany.mockResolvedValue([]);

      const result = await service.findAll();

      expect(prisma.user.findMany).toHaveBeenCalled();
      expect(result.items).toEqual([]);
    });

    it('should propagate unexpected errors from prisma', async () => {
      prisma.user.findMany.mockRejectedValue(new Error('DB failure'));

      await expect(service.findAll()).rejects.toThrow(Error);
    });

    it('should return paginated data', async () => {
      prismaMock.user.findMany.mockResolvedValue([
        { id: 1, name: 'A' },
        { id: 2, name: 'B' },
      ]);

      prismaMock.user.count.mockResolvedValue(10);

      const res = await service.findAll(1, 2);

      expect(res.items).toHaveLength(2);
      expect(res.total).toBe(10);
      expect(res.page).toBe(1);
      expect(res.lastPage).toBe(5);
    });
  });

  describe('FindOne', () => {
    it('should return a user on findOne', async () => {
      const user = {
        id: 1,
        login: 'u1',
        password: 'h1',
        name: 'User 1',
        role: 'NEW',
      };

      prisma.user.findUnique.mockResolvedValue(user);

      const result = await service.findOne(1);

      expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { id: 1 } });
      expect(result).toEqual(user);
    });

    it('should throw NotFoundException when findOne returns null', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
    });

    it('should propagate unexpected errors from prisma.findUnique', async () => {
      prisma.user.findUnique.mockRejectedValue(new Error('DB fail'));

      await expect(service.findOne(1)).rejects.toThrow(Error);
    });
  });

  describe('Remove', () => {
    it('should remove a user and return deleted user', async () => {
      const user = {
        id: 1,
        login: 'u1',
        password: 'h1',
        name: 'User 1',
        role: 'NEW',
      };

      prisma.user.delete.mockResolvedValue(user);

      const result = await service.remove(1);

      expect(prisma.user.delete).toHaveBeenCalledWith({ where: { id: 1 } });
      expect(result).toEqual(user);
    });

    it('should throw NotFoundException when delete fails with P2025', async () => {
      prisma.user.delete.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('Not found', {
          code: 'P2025',
          clientVersion: '4.0.0',
        }),
      );

      await expect(service.remove(999)).rejects.toThrow(NotFoundException);
    });

    it('should propagate unexpected errors from prisma.delete', async () => {
      prisma.user.delete.mockRejectedValue(new Error('delete fail'));

      await expect(service.remove(1)).rejects.toThrow(Error);
    });
  });
});
