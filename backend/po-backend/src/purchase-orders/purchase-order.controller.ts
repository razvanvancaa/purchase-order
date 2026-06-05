import { UseGuards, Controller, Post, Body, Get, Param, Patch } from "@nestjs/common";
import { CurrentUser } from "src/auth/current-user.decorator";
import { JwtAuthGuard } from "src/auth/jwt-auth.guard";
import { User } from "src/users/user.entity";
import { CreatePoDto } from "./dto/create-po.dto";
import { RejectPoDto } from "./dto/reject-po.dto";
import { UpdatePoDto } from "./dto/uptdate-po.dto";
import { PurchaseOrdersService } from "./purchase-orders.service";


@UseGuards(JwtAuthGuard)
@Controller('purchase-orders')
export class PurchaseOrdersController {
    constructor(private readonly poService: PurchaseOrdersService) { }

    @Post()
    create(@Body() dto: CreatePoDto, @CurrentUser() user: User) {
        return this.poService.create(dto, user);
    }

    @Get()
    findAll(@CurrentUser() user: User) {
        return this.poService.findAll(user);
    }

    @Get(':id')
    findOne(@Param('id') id: string, @CurrentUser() user: User) {
        return this.poService.findOne(id, user);
    }

    @Patch(':id')
    update(
        @Param('id') id: string,
        @Body() dto: UpdatePoDto,
        @CurrentUser() user: User,
    ) {
        return this.poService.update(id, dto, user);
    }

    @Post(':id/approve')
    approve(@Param('id') id: string, @CurrentUser() user: User) {
        return this.poService.approve(id, user);
    }

    @Post(':id/reject')
    reject(
        @Param('id') id: string,
        @Body() dto: RejectPoDto,
        @CurrentUser() user: User,
    ) {
        return this.poService.reject(id, dto, user);
    }

    @Post(':id/invoice')
    invoice(@Param('id') id: string, @CurrentUser() user: User) {
        return this.poService.invoice(id, user);
    }

    @Get(':id/history')
    getHistory(@Param('id') id: string) {
        return this.poService.getHistory(id);
    }
}