import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../src/prisma/prisma.service';
import { UserModule } from '../src/user/user.module';
import { Role } from '../src/common/enums/role.enum';
import { JwtAuthGuard } from '../src/common/guards/jwt-auth.guard';
import { RolesGuard } from '../src/common/guards/roles.guard';

// cria um guard customizável para cada teste
const mockUserGuard = (user: any) => ({
  canActivate(ctx) {
    const req = ctx.switchToHttp().getRequest();
    // jwt payload costuma ter `sub` como id do usuário; preservamos também `id` para compatibilidade
    req.user = { ...(user || {}), sub: user?.id };
    return true;
  },
});

describe('UsersController (e2e)', () => {
  let app: INestApplication;
  let prismaMock: any;

  beforeEach(async () => {
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
  });

  async function initWithUser(user) {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [UserModule],
    })
      .overrideProvider(PrismaService)
      .useValue(prismaMock)
      .overrideGuard(JwtAuthGuard)
      .useValue(mockUserGuard(user))
      // substitui RolesGuard por um mock simples que não depende de Reflector
      .overrideGuard(RolesGuard)
      .useValue({
        canActivate(ctx) {
          const req = ctx.switchToHttp().getRequest();
          const handler = ctx.getHandler();

          const requiredRoles = Reflect.getMetadata('roles', handler) || [];

          const userRole = req.user?.role;

          if (requiredRoles.length === 0) {
            return true;
          }

          return requiredRoles.includes(userRole);
        },
      })
      .compile();

    app = moduleFixture.createNestApplication();

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    await app.init();
  }

  afterEach(async () => {
    if (app) await app.close();
  });

  // -----------------------------------------
  // CREATE
  // -----------------------------------------
  describe('POST /users', () => {
    it('ADMIN should create a user', async () => {
      await initWithUser({ id: 1, role: Role.ADMIN });

      const dto = {
        name: 'Novo Usuário',
        login: 'novo123',
        password: '123456',
        role: Role.NOVO,
      };

      prismaMock.user.create.mockResolvedValue({ id: 1, ...dto });

      const res = await request(app.getHttpServer())
        .post('/users')
        .send(dto)
        .expect(201);

      // service.create retorna { ok: true } no serviço atual
      expect(res.body.ok).toBe(true);
    });

    it('USER should not create a user', async () => {
      await initWithUser({ id: 55, role: Role.NOVO });

      await request(app.getHttpServer())
        .post('/users')
        .send({
          name: 'Teste',
          login: 'teste',
          password: '123456',
          role: Role.NOVO,
        })
        .expect(403);
    });
  });

  // -----------------------------------------
  // GET ALL
  // -----------------------------------------
  describe('GET /users', () => {
    it('ADMIN should get all users', async () => {
      await initWithUser({ id: 1, role: Role.ADMIN });

      prismaMock.user.findMany.mockResolvedValue([]);

      const res = await request(app.getHttpServer()).get('/users').expect(200);

      // API retorna objeto paginado { items, total, page, limit, lastPage }
      expect(res.body.items).toEqual([]);
    });

    it('NOVO should not list all users', async () => {
      await initWithUser({ id: 2, role: Role.NOVO });

      await request(app.getHttpServer()).get('/users').expect(403);
    });
  });

  // -----------------------------------------
  // GET ONE
  // -----------------------------------------
  describe('GET /users/:id', () => {
    it('ADMIN should get any user', async () => {
      await initWithUser({ id: 1, role: Role.ADMIN });

      prismaMock.user.findUnique.mockResolvedValue({
        id: 10,
        name: 'Outro Usuário',
      });

      const res = await request(app.getHttpServer())
        .get('/users/10')
        .expect(200);

      expect(res.body.id).toBe(10);
    });

    it('USER should get own profile', async () => {
      await initWithUser({ id: 20, role: Role.USER });

      prismaMock.user.findUnique.mockResolvedValue({
        id: 20,
        name: 'Eu Mesmo',
      });

      const res = await request(app.getHttpServer())
        .get('/users/20')
        .expect(200);

      expect(res.body.id).toBe(20);
    });

    it('USER should NOT access another user', async () => {
      await initWithUser({ id: 20, role: Role.NOVO });

      prismaMock.user.findUnique.mockResolvedValue({
        id: 33,
        name: 'Outro',
      });

      await request(app.getHttpServer()).get('/users/33').expect(403);
    });
  });

  // -----------------------------------------
  // UPDATE
  // -----------------------------------------
  describe('PATCH /users/:id', () => {
    it('ADMIN can update any user', async () => {
      await initWithUser({ id: 1, role: Role.ADMIN });

      prismaMock.user.update.mockResolvedValue({
        id: 20,
        name: 'Atualizado',
      });

      const res = await request(app.getHttpServer())
        .patch('/users/20')
        .send({ name: 'Atualizado' })
        .expect(200);

      expect(res.body.id).toBe(20);
    });

    it('NOVO can update itself', async () => {
      await initWithUser({ id: 50, role: Role.NOVO });

      prismaMock.user.update.mockResolvedValue({
        id: 50,
        name: 'Meu nome',
      });

      const res = await request(app.getHttpServer())
        .patch('/users/50')
        .send({ name: 'Meu nome' })
        .expect(200);

      expect(res.body.id).toBe(50);
    });

    it('NOVO cannot update another user', async () => {
      await initWithUser({ id: 50, role: Role.NOVO });

      await request(app.getHttpServer())
        .patch('/users/90')
        .send({ name: 'Hackeado' })
        .expect(403);
    });
  });

  // -----------------------------------------
  // DELETE
  // -----------------------------------------
  describe('DELETE /users/:id', () => {
    it('ADMIN can delete', async () => {
      await initWithUser({ id: 1, role: Role.ADMIN });

      prismaMock.user.delete.mockResolvedValue({ id: 10 });

      await request(app.getHttpServer()).delete('/users/10').expect(200);
    });

    it('USER cannot delete', async () => {
      await initWithUser({ id: 40, role: Role.USER });

      await request(app.getHttpServer()).delete('/users/1').expect(403);
    });
  });
});
