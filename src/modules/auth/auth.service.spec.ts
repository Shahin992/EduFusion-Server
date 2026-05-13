import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { User } from '../../schemas/user.schema';
import { Institute } from '../../schemas/institute.schema';
import * as bcrypt from 'bcryptjs';
import { Types } from 'mongoose';

describe('AuthService', () => {
  let service: AuthService;
  let userModel: any;
  let instituteModel: any;
  let jwtService: any;

  const mockUser = {
    _id: new Types.ObjectId(),
    email: 'test@example.com',
    passwordHash: 'hashedPassword',
    name: 'Test User',
    role: 'admin',
    instituteId: new Types.ObjectId(),
    toObject: jest.fn().mockImplementation(function() { return this; }),
  };

  const mockInstitute = {
    _id: mockUser.instituteId,
    name: 'Test Institute',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: getModelToken(User.name),
          useValue: {
            findOne: jest.fn(),
            findById: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: getModelToken(Institute.name),
          useValue: {
            findById: jest.fn(),
            save: jest.fn(),
            findByIdAndUpdate: jest.fn(),
          },
        },
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn().mockReturnValue('mockToken'),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    userModel = module.get(getModelToken(User.name));
    instituteModel = module.get(getModelToken(Institute.name));
    jwtService = module.get(JwtService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('validateUser', () => {
    it('should return user if password matches', async () => {
      jest.spyOn(userModel, 'findOne').mockResolvedValue(mockUser);
      jest.spyOn(bcrypt, 'compare').mockImplementation(() => Promise.resolve(true));

      const result = await service.validateUser('test@example.com', 'password');
      expect(result).toBeDefined();
      expect(result.email).toBe('test@example.com');
    });

    it('should throw UnauthorizedException if password mismatch', async () => {
      jest.spyOn(userModel, 'findOne').mockResolvedValue(mockUser);
      jest.spyOn(bcrypt, 'compare').mockImplementation(() => Promise.resolve(false));

      await expect(service.validateUser('test@example.com', 'wrong')).rejects.toThrow();
    });
  });

  describe('login', () => {
    it('should return access token and user info', async () => {
      jest.spyOn(instituteModel, 'findById').mockResolvedValue(mockInstitute);

      const result = await service.login(mockUser);
      expect(result.access_token).toBe('mockToken');
      expect(result.user.email).toBe(mockUser.email);
    });
  });
});
