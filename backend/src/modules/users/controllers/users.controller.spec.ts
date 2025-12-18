import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { UsersService } from '../services/users.service';
import { CreateUserDto } from '../dto/create-user.dto';
import { UpdateUserDto } from '../dto/update-user.dto';
import { QueryUserDto } from '../dto/query-user.dto';

describe('UsersController', () => {
  let controller: UsersController;

  const mockService = {
    createUserByAdmin: jest.fn(),
    list: jest.fn(),
    findByIdSafe: jest.fn(),
    update: jest.fn(),
    deactivate: jest.fn(),
  } as Record<string, jest.Mock>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [{ provide: UsersService, useValue: mockService }],
    }).compile();

    controller = module.get<UsersController>(UsersController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should create user', async () => {
    const dto: CreateUserDto = {
      email: 'test@example.com',
      password: 'password123',
      role: 'manager' as any,
    };
    const serviceResult = { success: true, data: { id: 'u1', email: 'test@example.com' } };
    mockService.createUserByAdmin.mockResolvedValue(serviceResult);

    const res = await controller.create(dto);

    expect(mockService.createUserByAdmin).toHaveBeenCalledWith(dto);
    expect(res).toEqual(serviceResult);
  });

  it('should list users', async () => {
    const query: QueryUserDto = { page: 1 };
    const serviceResult = {
      success: true,
      data: [{ id: 'u1', email: 'test@example.com' }],
      total: 1,
    };
    mockService.list.mockResolvedValue(serviceResult);

    const res = await controller.list(query);

    expect(mockService.list).toHaveBeenCalledWith(query);
    expect(res).toEqual(serviceResult);
  });

  it('should get user by id', async () => {
    const serviceResult = { success: true, data: { id: 'u1', email: 'test@example.com' } };
    mockService.findByIdSafe.mockResolvedValue(serviceResult);

    const res = await controller.findOne('u1');

    expect(mockService.findByIdSafe).toHaveBeenCalledWith('u1');
    expect(res).toEqual(serviceResult);
  });

  it('should update user', async () => {
    const dto: UpdateUserDto = { fullName: 'Updated Name' };
    const req = { user: { userId: 'admin1' } } as any;
    const serviceResult = { success: true, message: 'User updated' };
    mockService.update.mockResolvedValue(serviceResult);

    const res = await controller.update('u1', dto, req);

    expect(mockService.update).toHaveBeenCalledWith('u1', dto, 'admin1');
    expect(res).toEqual(serviceResult);
  });

  it('should deactivate user', async () => {
    const req = { user: { userId: 'admin1' } } as any;
    const serviceResult = { success: true, message: 'User deactivated' };
    mockService.deactivate.mockResolvedValue(serviceResult);

    const res = await controller.deactivate('u1', req);

    expect(mockService.deactivate).toHaveBeenCalledWith('u1', 'admin1');
    expect(res).toEqual(serviceResult);
  });
});
