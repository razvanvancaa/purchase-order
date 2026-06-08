import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

@Injectable()
export class DatabaseService implements OnModuleInit {
  private readonly logger = new Logger(DatabaseService.name);

  constructor(@InjectDataSource() private dataSource: DataSource) {}

  async onModuleInit() {
    await this.createSelfApprovalTrigger();
    await this.setupPgCronBudgetReset();
  }

  private async createSelfApprovalTrigger() {
    try {
      await this.dataSource.query(`
        CREATE OR REPLACE FUNCTION prevent_self_approval()
        RETURNS TRIGGER AS $$
        DECLARE
          po_creator_id UUID;
        BEGIN
          IF NEW.action IN ('APPROVED', 'REJECTED', 'HARD_REJECTED')
             AND NEW."fromStatus" IN ('PENDING_IT', 'PENDING_FINANCE') THEN

            SELECT "createdById" INTO po_creator_id
            FROM purchase_orders
            WHERE id = NEW."purchaseOrderId";

            IF po_creator_id IS NOT NULL AND po_creator_id = NEW."performedById" THEN
              RAISE EXCEPTION 'Self-approval is not allowed at IT or Finance stage';
            END IF;
          END IF;
          RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
      `);

      await this.dataSource.query(`
        DROP TRIGGER IF EXISTS trg_prevent_self_approval ON po_history;
      `);

      await this.dataSource.query(`
        CREATE TRIGGER trg_prevent_self_approval
        BEFORE INSERT ON po_history
        FOR EACH ROW
        EXECUTE FUNCTION prevent_self_approval();
      `);

      this.logger.log('Self-approval trigger created');
    } catch (err) {
      this.logger.warn('Could not create self-approval trigger: ' + err.message);
    }
  }

  private async setupPgCronBudgetReset() {
    try {
      await this.dataSource.query(`CREATE EXTENSION IF NOT EXISTS pg_cron;`);

      // Remove old schedule if exists, then recreate
      await this.dataSource.query(`
        SELECT cron.unschedule(jobid)
        FROM cron.job
        WHERE jobname = 'annual-budget-reset';
      `);

      await this.dataSource.query(`
        SELECT cron.schedule(
          'annual-budget-reset',
          '0 0 1 1 *',
          $$UPDATE budgets SET used_amount = 0, "updatedAt" = NOW()$$
        );
      `);

      this.logger.log('pg_cron annual budget reset scheduled');
    } catch (err) {
      // pg_cron not available in dev without custom postgres image — that's ok
      this.logger.warn('pg_cron not available: ' + err.message);
    }
  }
}
