import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('AppController (e2e)', () => {
  let app: INestApplication;
  let prismaMock: any;

  beforeEach(async () => {
    prismaMock = {
      user: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn(),
      },
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService) // <--- substitui banco real
      .useValue(prismaMock)
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
  });

  afterAll(async () => {
    await app.close();
  });

  // ------------------------------------------------------------
  //  LOGIN
  // ------------------------------------------------------------
  describe('POST /auth/login', () => {
    it('should reject login when fields are empty', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ login: '', password: '' })
        .expect(400);

      expect(res.body.message).toContain('login should not be empty');
    });

    it('should reject login when user does not exist', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);

      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ login: 'nopeExist', password: '123456789' })
        .expect(401);

      expect(res.body.message).toContain('Not found');
    });

    it('should login successfully', async () => {
      prismaMock.user.findUnique.mockResolvedValue({
        id: 1,
        login: 'admin',
        password: '$2a$10$HASHAQUI', // qualquer hash
      });

      // sua service compara com bcrypt.compare()
      jest.spyOn(require('bcrypt'), 'compare').mockResolvedValue(true);

      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ login: 'admin', password: '123456' })
        .expect(200);

      expect(res.body).toHaveProperty('access_token');
    });
  });

  // ------------------------------------------------------------
  //  REGISTER
  // ------------------------------------------------------------
  describe('POST /auth/register', () => {
    it('should reject when name is empty', async () => {
      const dto = {
        name: '',
        login: 'admin',
        password: '1234',
      };

      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .send(dto)
        .expect(400);

      expect(res.body.message).toContain('name should not be empty');
    });

    it('should reject when login is empty', async () => {
      const dto = {
        name: 'Admin',
        login: '',
        password: '1234',
      };

      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .send(dto)
        .expect(400);

      expect(res.body.message).toContain('login should not be empty');
    });

    it('should reject when password too short', async () => {
      const dto = {
        name: 'Admin',
        login: 'admin',
        password: '1',
      };

      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .send(dto)
        .expect(400);

      expect(
        res.body.message.some((msg: string) => msg.includes('password')),
      ).toBe(true);
    });
  });
});
