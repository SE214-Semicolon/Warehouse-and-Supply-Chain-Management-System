import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from '../services/auth.service';
import { LoginDto } from '../dto/login.dto';
import { SignupDto } from '../dto/signup.dto';
import { RefreshDto } from '../dto/refresh.dto';

describe('AuthController', () => {
  let controller: AuthController;

  const mockService = {
    login: jest.fn(),
    signup: jest.fn(),
    refreshWithToken: jest.fn(),
    logout: jest.fn(),
    changePassword: jest.fn(),
  } as Record<string, jest.Mock>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: mockService }],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should login', async () => {
    const dto: LoginDto = { email: 'admin@example.com', password: 'admin123' };
    const serviceResult = { accessToken: 'token', refreshToken: 'refresh' };
    mockService.login.mockResolvedValue(serviceResult);

    const res = await controller.login(dto);

    expect(mockService.login).toHaveBeenCalledWith(dto.email, dto.password);
    expect(res).toEqual(serviceResult);
  });

  it('should signup', async () => {
    const dto: SignupDto = {
      email: 'test@example.com',
      password: 'password123',
      fullName: 'Test User',
    };
    const serviceResult = { success: true, userId: 'user123' };
    mockService.signup.mockResolvedValue(serviceResult);

    const res = await controller.signup(dto);

    expect(mockService.signup).toHaveBeenCalledWith(
      dto.email,
      dto.password,
      dto.fullName,
      undefined,
    );
    expect(res).toEqual(serviceResult);
  });

  it('should refresh token', async () => {
    const dto: RefreshDto = { refreshToken: 'oldtoken' };
    const serviceResult = { accessToken: 'newtoken' };
    mockService.refreshWithToken.mockResolvedValue(serviceResult);

    const res = await controller.refresh(dto);

    expect(mockService.refreshWithToken).toHaveBeenCalledWith(dto.refreshToken);
    expect(res).toEqual(serviceResult);
  });
});
