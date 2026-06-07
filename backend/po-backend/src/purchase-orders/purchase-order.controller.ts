import { UseGuards, Controller, Post, Body, Get, Param, Patch } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse, ApiParam } from '@nestjs/swagger';
import { CurrentUser } from 'src/auth/current-user.decorator';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { User } from 'src/users/user.entity';
import { CreatePoDto } from './dto/create-po.dto';
import { RejectPoDto } from './dto/reject-po.dto';
import { UpdatePoDto } from './dto/uptdate-po.dto';
import { PurchaseOrdersService } from './purchase-orders.service';

@ApiTags('Purchase Orders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('purchase-orders')
export class PurchaseOrdersController {
  constructor(private readonly poService: PurchaseOrdersService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new Purchase Order' })
  @ApiResponse({ status: 201, description: 'PO created' })
  create(@Body() dto: CreatePoDto, @CurrentUser() user: User) {
    return this.poService.create(dto, user);
  }

  @Get()
  @ApiOperation({ summary: 'List POs (filtered by role)' })
  @ApiResponse({ status: 200, description: 'List of POs visible to the current user' })
  findAll(@CurrentUser() user: User) {
    return this.poService.findAll(user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single Purchase Order' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 200, description: 'PO details' })
  @ApiResponse({ status: 404, description: 'PO not found' })
  findOne(@Param('id') id: string, @CurrentUser() user: User) {
    return this.poService.findOne(id, user);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Edit PO (only when status is NEEDS_REWORK)' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 200, description: 'PO updated and resubmitted' })
  @ApiResponse({ status: 403, description: 'Forbidden — PO is not in NEEDS_REWORK status' })
  update(@Param('id') id: string, @Body() dto: UpdatePoDto, @CurrentUser() user: User) {
    return this.poService.update(id, dto, user);
  }

  @Post(':id/approve')
  @ApiOperation({ summary: 'Approve a PO (Manager / IT / Finance)' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 201, description: 'PO approved and moved to next stage' })
  @ApiResponse({ status: 403, description: 'User role does not match current PO stage' })
  approve(@Param('id') id: string, @CurrentUser() user: User) {
    return this.poService.approve(id, user);
  }

  @Post(':id/reject')
  @ApiOperation({ summary: 'Reject a PO (Manager / IT / Finance)' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 201, description: 'PO rejected, status set to NEEDS_REWORK' })
  @ApiResponse({ status: 403, description: 'User role does not match current PO stage' })
  reject(@Param('id') id: string, @Body() dto: RejectPoDto, @CurrentUser() user: User) {
    return this.poService.reject(id, dto, user);
  }

  @Post('monthly-spending')
  @ApiOperation({ summary: 'Get monthly spending per requester (Finance only)' })
  @ApiResponse({ status: 200, description: 'List of requesters with their monthly total' })
  getMonthlySpendings() {
    return this.poService.getMonthlySpendings();
  }

  @Post(':id/hard-reject')
  @ApiOperation({ summary: 'Permanently reject a PO (Finance only, exceeds monthly cap)' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 201, description: 'PO permanently rejected' })
  @ApiResponse({ status: 403, description: 'Finance only or wrong status' })
  hardReject(@Param('id') id: string, @Body() dto: RejectPoDto, @CurrentUser() user: User) {
    return this.poService.hardReject(id, dto, user);
  }

  @Post(':id/invoice')
  @ApiOperation({ summary: 'Mark PO as invoiced (Finance only)' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 201, description: 'PO invoiced' })
  @ApiResponse({ status: 403, description: 'PO not ready for invoicing or wrong role' })
  invoice(@Param('id') id: string, @CurrentUser() user: User) {
    return this.poService.invoice(id, user);
  }

  @Get(':id/history')
  @ApiOperation({ summary: 'Get full approval history for a PO' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 200, description: 'List of history entries' })
  getHistory(@Param('id') id: string) {
    return this.poService.getHistory(id);
  }
}
