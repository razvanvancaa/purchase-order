import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from 'src/auth/current-user.decorator';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { Roles } from 'src/auth/roles.decorator';
import { RolesGuard } from 'src/auth/roles.guards';
import { UserRole, User } from 'src/users/user.entity';
import { BudgetRequestsService } from './budget-requests.service';

@ApiTags('Budget Requests')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('budget-requests')
export class BudgetRequestsController {
  constructor(private service: BudgetRequestsService) {}

  @Post()
  @ApiOperation({ summary: 'Submit a budget supplement request' })
  create(
    @CurrentUser() user: User,
    @Body('description') description: string,
    @Body('requestedLimit') requestedLimit?: number,
  ) {
    return this.service.create(user, description, requestedLimit);
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles(UserRole.MANAGER, UserRole.ADMIN)
  @ApiOperation({ summary: 'List all budget requests (Manager/Admin)' })
  findAll() {
    return this.service.findAll();
  }

  @Get('mine')
  @ApiOperation({ summary: 'List my budget requests' })
  findMine(@CurrentUser() user: User) {
    return this.service.findForUser(user.id);
  }

  @Patch(':id/approve')
  @UseGuards(RolesGuard)
  @Roles(UserRole.MANAGER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Approve a budget request and set new limit' })
  approve(
    @Param('id') id: string,
    @CurrentUser() reviewer: User,
    @Body('newLimit') newLimit: number,
  ) {
    return this.service.approve(id, reviewer, newLimit);
  }

  @Patch(':id/reject')
  @UseGuards(RolesGuard)
  @Roles(UserRole.MANAGER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Reject a budget request' })
  reject(
    @Param('id') id: string,
    @CurrentUser() reviewer: User,
    @Body('comment') comment: string,
  ) {
    return this.service.reject(id, reviewer, comment);
  }
}
