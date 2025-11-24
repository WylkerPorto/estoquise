import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { ConflictException, UnauthorizedException } from '@nestjs/common';

const prismaMock = {
  user: {
    findUnique: jest.fn(),
    create: jest.fn(),
  },
};

const jwtMock = {
  signAsync: jest.fn(),
  verifyAsync: jest.fn(),
};

describe('AuthController', () => {
  let controller: AuthController;
  let authService: AuthService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: {
            login: jest.fn(),
            register: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get(AuthController);
    authService = module.get(AuthService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('login', () => {
    it('should call AuthService.login and return its result', async () => {
      // DTO que será enviado ao controller
      const dto = { login: 'admin', password: '1234' };

      // Mock da resposta do service para um login válido
      const resultMock = {
        access_token: 'jwt-token',
        user: {
          name: 'Administrador',
          role: 'ADMIN',
        },
      };

      // Dizemos para o mock do service.login retornar isso
      jest.spyOn(authService, 'login').mockResolvedValue(resultMock);

      // ⚡ Chamamos o controller
      const result = await controller.login(dto);

      // Verifica se o controller retornou o que o service retornou
      expect(result).toEqual(resultMock);

      // Verifica se o controller chamou o service.login com o DTO
      expect(authService.login).toHaveBeenCalledWith(dto);
    });

    it('should throw UnauthorizedException if user not found', async () => {
      const dto = { login: 'ghost', password: '1234' };

      // O service.login vai rejeitar com UnauthorizedException
      jest
        .spyOn(authService, 'login')
        .mockRejectedValue(new UnauthorizedException('Usuário não encontrado'));

      // Verifica que o controller repassa a exceção corretamente
      await expect(controller.login(dto)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException if password is wrong', async () => {
      const dto = { login: 'admin', password: 'wrong' };

      // Mocka o erro que o service retornaria
      jest
        .spyOn(authService, 'login')
        .mockRejectedValue(new UnauthorizedException('Senha inválida'));

      // Verifica se o controller também lança UnauthorizedException
      await expect(controller.login(dto)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('register', () => {
    it('should call AuthService.register and return its result', async () => {
      const dto = {
        name: 'Administrador',
        login: 'admin',
        password: '1234',
      };

      const resultMock = { ok: true };

      jest.spyOn(authService, 'register').mockResolvedValue(resultMock);
      const result = await controller.register(dto);
      expect(result).toEqual(resultMock);
      expect(authService.register).toHaveBeenCalledWith(dto);
    });

    it('should throw ConflictException if user already exists', async () => {
      const dto = {
        name: 'Admin',
        login: 'admin',
        password: '1234',
      };

      jest
        .spyOn(authService, 'register')
        .mockRejectedValue(new ConflictException('Usuário já cadastrado'));

      await expect(controller.register(dto)).rejects.toThrow(ConflictException);
    });
  });
});
