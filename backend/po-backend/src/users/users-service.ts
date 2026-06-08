import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import * as bcrypt from 'bcryptjs';
import { UpdateRoleDto } from "./dto/uptdate-role.dto";
import { UpdateProfileDto } from "./dto/update-profile.dto";
import { User } from "./user.entity";

@Injectable()
export class UsersService {
    constructor(
        @InjectRepository(User)
        private usersRepository: Repository<User>,
    ) { }

    async findAll(): Promise<User[]> {
        return this.usersRepository.find();
    }

    async findById(id: string): Promise<User> {
        const user = await this.usersRepository.findOne({ where: { id } });
        if (!user) throw new NotFoundException('User not found');
        return user;
    }

    async updateRole(id: string, dto: UpdateRoleDto): Promise<User> {
        const user = await this.findById(id);
        user.role = dto.role;
        return this.usersRepository.save(user);
    }

    async updateProfile(id: string, dto: UpdateProfileDto): Promise<User> {
        const user = await this.findById(id);
        if (dto.name) user.name = dto.name;
        if (dto.password) user.password = await bcrypt.hash(dto.password, 10);
        return this.usersRepository.save(user);
    }
}