import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from './jwt.guard';
import { RolesGuard } from './roles.guard';
import { Roles } from './decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { InviteService } from './invite.service';
import { CreateInviteDto } from './dto/create-invite.dto';
import { QueryInviteDto } from './dto/query-invite.dto';

@ApiTags('invites')
@Controller('invites')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class InviteController {
  constructor(private readonly inviteService: InviteService) {}

  @Post()
  @Roles(UserRole.admin, UserRole.manager)
  @ApiOperation({ summary: 'Tạo invite token (admin/manager only)' })
  async createInvite(
    @Body() dto: CreateInviteDto,
    @Req() req: { user: { userId: string } },
  ) {
    return this.inviteService.createInvite(dto, req.user.userId);
  }

  @Get()
  @Roles(UserRole.admin, UserRole.manager)
  @ApiOperation({ summary: 'List invites với filters' })
  async listInvites(@Query() query: QueryInviteDto) {
    return this.inviteService.listInvites(query);
  }

  @Get(':id')
  @Roles(UserRole.admin, UserRole.manager)
  @ApiOperation({ summary: 'Chi tiết invite' })
  async getInvite(@Param('id') id: string) {
    return this.inviteService.getInviteById(id);
  }

  @Post(':id/resend')
  @Roles(UserRole.admin, UserRole.manager)
  @ApiOperation({ summary: 'Resend invite (tạo token mới)' })
  async resendInvite(
    @Param('id') id: string,
    @Req() req: { user: { userId: string } },
  ) {
    return this.inviteService.resendInvite(id, req.user.userId);
  }

  @Delete(':id')
  @Roles(UserRole.admin, UserRole.manager)
  @ApiOperation({ summary: 'Revoke/delete invite' })
  async revokeInvite(@Param('id') id: string) {
    await this.inviteService.revokeInvite(id);
    return { message: 'Invite revoked successfully' };
  }

  @Post('cleanup')
  @Roles(UserRole.admin)
  @ApiOperation({ summary: 'Clean up expired invites (admin only)' })
  async cleanupExpired() {
    const count = await this.inviteService.cleanupExpiredInvites();
    return { message: `Cleaned up ${count} expired invites` };
  }
}

