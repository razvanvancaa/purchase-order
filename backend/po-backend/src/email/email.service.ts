import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { Transporter } from 'nodemailer';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: Transporter | null = null;

  constructor(private config: ConfigService) {
    const host = config.get('MAIL_HOST');
    if (host) {
      this.transporter = nodemailer.createTransport({
        host,
        port: config.get<number>('MAIL_PORT') ?? 587,
        secure: false,
        auth: {
          user: config.get('MAIL_USER'),
          pass: config.get('MAIL_PASS'),
        },
      });
    }
  }

  async send(to: string | string[], subject: string, html: string): Promise<void> {
    const from = this.config.get('MAIL_FROM') ?? 'noreply@company.com';
    if (!this.transporter) {
      this.logger.debug(`[EMAIL → ${Array.isArray(to) ? to.join(', ') : to}] ${subject}`);
      return;
    }
    try {
      await this.transporter.sendMail({ from, to, subject, html });
    } catch (err) {
      this.logger.error(`Failed to send email to ${to}: ${err.message}`);
    }
  }

  statusChangeHtml(poTitle: string, newStatus: string, comment?: string): string {
    const statusLabels: Record<string, string> = {
      PENDING_MANAGER: 'Pending Manager Approval',
      PENDING_IT: 'Pending IT Approval',
      PENDING_FINANCE: 'Pending Finance Approval',
      NEEDS_REWORK: 'Sent Back for Rework',
      INVOICED: 'Invoiced',
      PERMANENTLY_REJECTED: 'Permanently Rejected',
    };
    const label = statusLabels[newStatus] ?? newStatus;
    return `
      <p>Your purchase order <strong>${poTitle}</strong> has a new status:</p>
      <p style="font-size:18px;font-weight:bold;color:#1d4ed8">${label}</p>
      ${comment ? `<p><strong>Comment:</strong> ${comment}</p>` : ''}
      <p style="color:#6b7280;font-size:12px">This is an automated notification from the PO system.</p>
    `;
  }

  budgetUpdateHtml(userName: string, limit: number, year: number): string {
    return `
      <p>Hi <strong>${userName}</strong>,</p>
      <p>Your annual spending budget for <strong>${year}</strong> has been updated:</p>
      <p style="font-size:22px;font-weight:bold;color:#1d4ed8">€${Number(limit).toLocaleString('en-GB', { minimumFractionDigits: 2 })}</p>
      <p style="color:#6b7280;font-size:12px;margin-top:16px">This is an automated notification from the PO system.</p>
    `;
  }

  budgetRejectedHtml(userName: string, comment: string): string {
    return `
      <p>Hi <strong>${userName}</strong>,</p>
      <p>Your budget supplement request has been <strong style="color:#dc2626">rejected</strong>.</p>
      <p><strong>Reason:</strong></p>
      <p style="background:#fef2f2;border-left:3px solid #ef4444;padding:8px 12px;margin:4px 0">${comment}</p>
      <p style="color:#6b7280;font-size:12px;margin-top:16px">This is an automated notification from the PO system.</p>
    `;
  }

  budgetRequestHtml(requesterName: string, requesterEmail: string, description: string, currentLimit: number | null): string {
    return `
      <p>A budget supplement request has been submitted:</p>
      <table style="border-collapse:collapse;margin-top:8px">
        <tr><td style="padding:4px 12px 4px 0;color:#6b7280">Employee</td><td><strong>${requesterName}</strong></td></tr>
        <tr><td style="padding:4px 12px 4px 0;color:#6b7280">Email</td><td>${requesterEmail}</td></tr>
        ${currentLimit !== null ? `<tr><td style="padding:4px 12px 4px 0;color:#6b7280">Current limit</td><td><strong>€${Number(currentLimit).toLocaleString('en-GB', { minimumFractionDigits: 2 })}</strong></td></tr>` : ''}
      </table>
      <p style="margin-top:12px"><strong>Reason:</strong></p>
      <p style="background:#f9fafb;border-left:3px solid #3b82f6;padding:8px 12px;margin:4px 0">${description}</p>
      <p style="color:#6b7280;font-size:12px;margin-top:16px">Log in to the PO system to update their budget.</p>
    `;
  }

  financeReviewHtml(poTitle: string, amount: number, requesterName: string): string {
    return `
      <p>A purchase order requires Finance review:</p>
      <table style="border-collapse:collapse;margin-top:8px">
        <tr><td style="padding:4px 12px 4px 0;color:#6b7280">Title</td><td><strong>${poTitle}</strong></td></tr>
        <tr><td style="padding:4px 12px 4px 0;color:#6b7280">Amount</td><td><strong>€${amount}</strong></td></tr>
        <tr><td style="padding:4px 12px 4px 0;color:#6b7280">Requested by</td><td>${requesterName}</td></tr>
      </table>
      <p style="color:#6b7280;font-size:12px;margin-top:16px">Log in to the PO system to review this order.</p>
    `;
  }
}
