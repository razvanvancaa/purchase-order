import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { POHistory } from './po-history.entity';

@Module({
    imports: [TypeOrmModule.forFeature([POHistory])],

})
export class POHistoryModule { }