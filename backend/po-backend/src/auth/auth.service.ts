import {
    ConflictException,
    Injectable,
    UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { User } from '../users/user.entity';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
    constructor(
        @InjectRepository(User)
        private usersRepository: Repository<User>,
        private jwtService: JwtService,
    ) { }

    async register(dto: RegisterDto) {
        const existing = await this.usersRepository.findOne({
            where: { email: dto.email },
        });

        if (existing) throw new ConflictException('Email already in use');

        const hashed = await bcrypt.hash(dto.password, 10);
        const user = this.usersRepository.create({ ...dto, password: hashed });
        await this.usersRepository.save(user);

        return { message: 'User registered successfully' };
    }

    async login(dto: LoginDto) {
        const user = await this.usersRepository.findOne({
            where: { email: dto.email },
        });
        if (!user) throw new UnauthorizedException('Invalid credentials');

        const valid = await bcrypt.compare(dto.password, user.password);
        if (!valid) throw new UnauthorizedException('Invalid credentials');

        const payload = { sub: user.id, email: user.email, role: user.role };
        const access_token = this.jwtService.sign(payload);
        const refresh_token = this.jwtService.sign(payload, { expiresIn: '7d' });
        return { access_token, refresh_token };
    }

    async refresh(token: string): Promise<{ access_token: string }> {
        try {
            const payload = this.jwtService.verify<{ sub: string; email: string; role: string }>(token);
            const access_token = this.jwtService.sign({
                sub: payload.sub,
                email: payload.email,
                role: payload.role,
            });
            return { access_token };
        } catch {
            throw new Error('Invalid refresh token');
        }
    }
}