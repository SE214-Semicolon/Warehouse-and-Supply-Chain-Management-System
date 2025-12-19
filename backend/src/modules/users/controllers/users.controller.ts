import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt.guard';
import { RolesGuard } from 'src/modules/auth/guards/roles.guard';
import { Roles } from 'src/modules/auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { UsersService } from '../services/users.service';
import { CreateUserDto } from '../dto/create-user.dto';
import { UpdateUserDto } from '../dto/update-user.dto';
import { QueryUserDto } from '../dto/query-user.dto';

@ApiTags('users')
@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @ApiOperation({ summary: 'Create new user (Admin only)' })
  @Roles(UserRole.admin)
  create(@Body() dto: CreateUserDto) {
    return this.usersService.createUserByAdmin(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List users with filter/pagination' })
  @Roles(UserRole.admin, UserRole.manager)
  list(@Query() query: QueryUserDto) {
    return this.usersService.list(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user details (exclude passwordHash)' })
  @Roles(UserRole.admin, UserRole.manager)
  findOne(@Param('id') id: string) {
    return this.usersService.findByIdSafe(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update user (prevent self role change)' })
  @Roles(UserRole.admin, UserRole.manager)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
    @Req() req: { user: { userId: string } },
  ) {
    return this.usersService.update(id, dto, req.user.userId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Deactivate user (soft delete, prevent self-delete)' })
  @Roles(UserRole.admin)
  deactivate(@Param('id') id: string, @Req() req: { user: { userId: string } }) {
    return this.usersService.deactivate(id, req.user.userId);
  }
}
