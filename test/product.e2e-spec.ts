import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../src/prisma/prisma.service';
import { ProductModule } from '../src/product/product.module';
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

describe('ProductsController (e2e)', () => {
  let app: INestApplication;
  let prismaMock: any;

  beforeEach(async () => {
    prismaMock = {
      product: {
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
      imports: [ProductModule],
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

  //-----------------------------
  // CREATE
  //-----------------------------
  describe('POST /products', () => {
    it('ADMIN should create a product', async () => {
      await initWithUser({ id: 1, role: Role.ADMIN });

      const dto = {
        name: 'Product A',
        obs: 'Description A',
        price: 100,
        quantity: 50,
      };

      prismaMock.product.create.mockResolvedValue({
        id: 1,
        ...dto,
      });

      const res = await request(app.getHttpServer())
        .post('/products')
        .send(dto)
        .expect(201);

      expect(res.body.ok).toEqual(true);
    });

    it('ESTOQUE should create a product', async () => {
      await initWithUser({ id: 1, role: Role.ESTOQUE });

      const dto = {
        name: 'Product A',
        obs: 'Description A',
        price: 100,
        quantity: 50,
      };

      prismaMock.product.create.mockResolvedValue({
        id: 1,
        ...dto,
      });

      const res = await request(app.getHttpServer())
        .post('/products')
        .send(dto)
        .expect(201);

      expect(res.body.ok).toEqual(true);
    });

    it('NOVO should not create a product', async () => {
      await initWithUser({ id: 1, role: Role.NOVO });

      await request(app.getHttpServer())
        .post('/products')
        .send({
          name: 'Product A',
          obs: 'Description A',
          price: 100,
          quantity: 50,
        })
        .expect(403);
    });

    it('CAIXA should not create a product', async () => {
      await initWithUser({ id: 1, role: Role.CAIXA });

      await request(app.getHttpServer())
        .post('/products')
        .send({
          name: 'Product A',
          obs: 'Description A',
          price: 100,
          quantity: 50,
        })
        .expect(403);
    });

    it('should fail with invalid data', async () => {
      await initWithUser({ id: 1, role: Role.ADMIN });

      await request(app.getHttpServer())
        .post('/products')
        .send({
          name: 'Pr',
          obs: 'Description A',
          price: -100,
          quantity: -50,
        })
        .expect(400);
    });
  });

  //-----------------------------
  // GET ALL
  //-----------------------------
  describe('GET /products', () => {
    it('ADMIN should get all products', async () => {
      await initWithUser({ id: 1, role: Role.ADMIN });

      prismaMock.product.findMany.mockResolvedValue([
        {
          id: 1,
          name: 'Product A',
          obs: 'Description A',
          price: 100,
          quantity: 50,
        },
        {
          id: 2,
          name: 'Product B',
          obs: 'Description B',
          price: 200,
          quantity: 100,
        },
      ]);

      const res = await request(app.getHttpServer())
        .get('/products')
        .expect(200);

      expect(res.body.items).toHaveLength(2);
    });

    it('ESTOQUE should get all products', async () => {
      await initWithUser({ id: 1, role: Role.ESTOQUE });

      prismaMock.product.findMany.mockResolvedValue([
        {
          id: 1,
          name: 'Product A',
          obs: 'Description A',
          price: 100,
          quantity: 50,
        },
        {
          id: 2,
          name: 'Product B',
          obs: 'Description B',
          price: 200,
          quantity: 100,
        },
      ]);

      const res = await request(app.getHttpServer())
        .get('/products')
        .expect(200);

      expect(res.body.items).toHaveLength(2);
    });

    it('CAIXA should get all products', async () => {
      await initWithUser({ id: 1, role: Role.CAIXA });

      prismaMock.product.findMany.mockResolvedValue([
        {
          id: 1,
          name: 'Product A',
          obs: 'Description A',
          price: 100,
          quantity: 50,
        },
        {
          id: 2,
          name: 'Product B',
          obs: 'Description B',
          price: 200,
          quantity: 100,
        },
      ]);

      const res = await request(app.getHttpServer())
        .get('/products')
        .expect(200);

      expect(res.body.items).toHaveLength(2);
    });

    it('NOVO should not list products', async () => {
      await initWithUser({ id: 1, role: Role.NOVO });

      await request(app.getHttpServer()).get('/products').expect(403);
    });
  });

  //-----------------------------
  // GET ONE
  //-----------------------------
  describe('GET /products/:id', () => {
    it('ADMIN should get a product', async () => {
      await initWithUser({ id: 1, role: Role.ADMIN });

      prismaMock.product.findUnique.mockResolvedValue({
        id: 1,
        name: 'Product A',
        obs: 'Description A',
        price: 100,
        quantity: 50,
      });

      const res = await request(app.getHttpServer())
        .get('/products/1')
        .expect(200);

      expect(res.body.id).toBe(1);
    });

    it('ESTOQUE should get a product', async () => {
      await initWithUser({ id: 1, role: Role.ESTOQUE });

      prismaMock.product.findUnique.mockResolvedValue({
        id: 1,
        name: 'Product A',
        obs: 'Description A',
        price: 100,
        quantity: 50,
      });

      const res = await request(app.getHttpServer())
        .get('/products/1')
        .expect(200);

      expect(res.body.id).toBe(1);
    });

    it('CAIXA should get a product', async () => {
      await initWithUser({ id: 1, role: Role.CAIXA });

      prismaMock.product.findUnique.mockResolvedValue({
        id: 1,
        name: 'Product A',
        obs: 'Description A',
        price: 100,
        quantity: 50,
      });

      const res = await request(app.getHttpServer())
        .get('/products/1')
        .expect(200);

      expect(res.body.id).toBe(1);
    });

    it('NOVO should not get a product', async () => {
      await initWithUser({ id: 1, role: Role.NOVO });

      await request(app.getHttpServer()).get('/products/1').expect(403);
    });
  });

  //-----------------------------
  // UPDATE
  //-----------------------------
  describe('PATCH /products/:id', () => {
    it('ADMIN should update a product', async () => {
      await initWithUser({ id: 1, role: Role.ADMIN });

      prismaMock.product.update.mockResolvedValue({
        id: 1,
        name: 'Product A',
        obs: 'Description A',
        price: 100,
        quantity: 50,
      });

      const res = await request(app.getHttpServer())
        .patch('/products/1')
        .send({ name: 'Product A' })
        .expect(200);

      expect(res.body.id).toBe(1);
    });

    it('ESTOQUE should update a product', async () => {
      await initWithUser({ id: 1, role: Role.ESTOQUE });

      prismaMock.product.update.mockResolvedValue({
        id: 1,
        name: 'Product A',
        obs: 'Description A',
        price: 100,
        quantity: 50,
      });

      const res = await request(app.getHttpServer())
        .patch('/products/1')
        .send({ name: 'Product A' })
        .expect(200);

      expect(res.body.id).toBe(1);
    });

    it('CAIXA should not update a product', async () => {
      await initWithUser({ id: 1, role: Role.CAIXA });

      await request(app.getHttpServer())
        .patch('/products/1')
        .send({ name: 'Product A' })
        .expect(403);
    });

    it('NOVO should not update a product', async () => {
      await initWithUser({ id: 1, role: Role.NOVO });

      await request(app.getHttpServer())
        .patch('/products/1')
        .send({ name: 'Product A' })
        .expect(403);
    });
  });

  //-----------------------------
  // REMOVE
  //-----------------------------
  describe('DELETE /products/:id', () => {
    it('ADMIN should delete a product', async () => {
      await initWithUser({ id: 1, role: Role.ADMIN });

      prismaMock.product.delete.mockResolvedValue({
        id: 1,
        name: 'Product A',
        obs: 'Description A',
        price: 100,
        quantity: 50,
      });

      await request(app.getHttpServer()).delete('/products/1').expect(200);
    });

    it('ESTOQUE should delete a product', async () => {
      await initWithUser({ id: 1, role: Role.ESTOQUE });

      prismaMock.product.delete.mockResolvedValue({
        id: 1,
        name: 'Product A',
        obs: 'Description A',
        price: 100,
        quantity: 50,
      });

      await request(app.getHttpServer()).delete('/products/1').expect(200);
    });

    it('CAIXA should not delete a product', async () => {
      await initWithUser({ id: 1, role: Role.CAIXA });

      await request(app.getHttpServer()).delete('/products/1').expect(403);
    });

    it('NOVO should not delete a product', async () => {
      await initWithUser({ id: 1, role: Role.NOVO });

      await request(app.getHttpServer()).delete('/products/1').expect(403);
    });
  });
});
