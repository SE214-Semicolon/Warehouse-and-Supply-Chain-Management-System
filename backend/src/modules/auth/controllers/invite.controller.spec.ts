import { Test, TestingModule } from '@nestjs/testing';
import { InviteController } from './invite.controller';
import { InviteService } from '../services/invite.service';
import { CreateInviteDto } from '../dto/create-invite.dto';
import { QueryInviteDto } from '../dto/query-invite.dto';

describe('InviteController', () => {
  let controller: InviteController;

  const mockService = {
    createInvite: jest.fn(),
    listInvites: jest.fn(),
    getInviteById: jest.fn(),
    resendInvite: jest.fn(),
    revokeInvite: jest.fn(),
    cleanupExpiredInvites: jest.fn(),
  } as Record<string, jest.Mock>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [InviteController],
      providers: [{ provide: InviteService, useValue: mockService }],
    }).compile();

    controller = module.get<InviteController>(InviteController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should create invite', async () => {
    const dto: CreateInviteDto = { email: 'invite@example.com', role: 'manager' as any };
    const req = { user: { userId: 'admin1' } } as any;
    const serviceResult = { success: true, invite: { id: 'invite1', token: 'token123' } };
    mockService.createInvite.mockResolvedValue(serviceResult);

    const res = await controller.createInvite(dto, req);

    expect(mockService.createInvite).toHaveBeenCalledWith(dto, 'admin1');
    expect(res).toEqual(serviceResult);
  });

  it('should list invites', async () => {
    const query: QueryInviteDto = { page: 1 };
    const serviceResult = {
      success: true,
      data: [{ id: 'invite1', email: 'test@example.com' }],
      total: 1,
    };
    mockService.listInvites.mockResolvedValue(serviceResult);

    const res = await controller.listInvites(query);

    expect(mockService.listInvites).toHaveBeenCalledWith(query);
    expect(res).toEqual(serviceResult);
  });

  it('should get invite by id', async () => {
    const serviceResult = { success: true, invite: { id: 'invite1' } };
    mockService.getInviteById.mockResolvedValue(serviceResult);

    const res = await controller.getInvite('invite1');

    expect(mockService.getInviteById).toHaveBeenCalledWith('invite1');
    expect(res).toEqual(serviceResult);
  });

  it('should revoke invite', async () => {
    mockService.revokeInvite.mockResolvedValue(undefined);

    const res = await controller.revokeInvite('invite1');

    expect(mockService.revokeInvite).toHaveBeenCalledWith('invite1');
    expect(res).toEqual({ message: 'Invite revoked successfully' });
  });
});
