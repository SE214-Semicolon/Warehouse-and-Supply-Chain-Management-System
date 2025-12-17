import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { UsersModule } from '../users/users.module';
import { PrismaModule } from '../../database/prisma/prisma.module';
import { AuthService } from './services/auth.service';
import { AuthController } from './controllers/auth.controller';
import { InviteService } from './services/invite.service';
import { InviteController } from './controllers/invite.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { RolesGuard } from './guards/roles.guard';

@Module({
  imports: [
    UsersModule,
    PrismaModule,
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_ACCESS_SECRET') || 'dev-access-secret',
        signOptions: { expiresIn: configService.get<string>('JWT_ACCESS_TTL') || '900s' },
      }),
    }),
  ],
  controllers: [AuthController, InviteController],
  providers: [AuthService, InviteService, JwtStrategy, RolesGuard],
})
export class AuthModule {}
