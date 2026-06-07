import { Exclude } from 'class-transformer';
import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

export enum UserRole {
  REQUESTER = 'REQUESTER',
  MANAGER = 'MANAGER',
  IT = 'IT',
  FINANCE = 'FINANCE',
  ADMIN = 'ADMIN',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true })
  email!: string;

  @Exclude()
  @Column()
  password!: string;

  @Column()
  name!: string;

  @Column({ type: 'enum', enum: UserRole, default: UserRole.REQUESTER, nullable: false })
  role!: UserRole;

  @CreateDateColumn()
  createdAt!: Date;
}
