import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from 'src/users/user.entity';
import { EmailService } from './email.service';
import { NotificationsService } from './notifications.service';

@Module({
  imports: [TypeOrmModule.forFeature([User])],
  providers: [EmailService, NotificationsService],
  exports: [EmailService, NotificationsService],
})
export class EmailModule {}
