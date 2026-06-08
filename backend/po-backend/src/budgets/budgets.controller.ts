import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from 'src/auth/current-user.decorator';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { Roles } from 'src/auth/roles.decorator';
import { RolesGuard } from 'src/auth/roles.guards';
import { UserRole, User } from 'src/users/user.entity';
import { BudgetsService } from './budgets.service';
import { SetBudgetDto } from './dto/set-budget.dto';

@ApiTags('Budgets')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('budgets')
export class BudgetsController {
  constructor(private budgetsService: BudgetsService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get my current year budget' })
  getMyBudget(@CurrentUser() user: User, @Query('year') year?: string) {
    return this.budgetsService.getBudgetForUser(user.id, year ? +year : undefined);
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.FINANCE)
  @ApiOperation({ summary: 'List all budgets (Admin/Finance only)' })
  getAllBudgets(@Query('year') year?: string) {
    return this.budgetsService.getAllBudgets(year ? +year : undefined);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Set annual budget for a user (Admin only)' })
  setBudget(@Body() dto: SetBudgetDto) {
    return this.budgetsService.setBudget(dto);
  }

}
