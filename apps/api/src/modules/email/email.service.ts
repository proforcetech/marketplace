import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

/**
 * Email service using nodemailer with SMTP transport.
 *
 * In development (SMTP_HOST not set): uses nodemailer's jsonTransport
 * and logs the output for debugging.
 *
 * Templates are implemented as simple string interpolation -- no external
 * template engine to keep dependencies minimal. For complex templates,
 * consider migrating to MJML or React Email in a future iteration.
 */

interface TemplateDefinition {
  subject: string;
  body: string;
}

type TemplateData = Record<string, unknown>;

const TEMPLATES: Record<string, (data: TemplateData) => TemplateDefinition> = {
  welcome: (data) => ({
    subject: 'Welcome to Marketplace!',
    body: [
      `Hi ${String(data['displayName'] ?? 'there')},`,
      '',
      'Welcome to Marketplace! We\'re excited to have you join our community of local buyers and sellers.',
      '',
      'Here are a few things you can do to get started:',
      '- Browse listings in your area',
      '- Create your first listing',
      '- Verify your phone number for added trust',
      '',
      'Happy buying and selling!',
      'The Marketplace Team',
    ].join('\n'),
  }),

  'email-verification': (data) => ({
    subject: 'Verify your email',
    body: [
      `Hi ${String(data['displayName'] ?? 'there')},`,
      '',
      'Please verify your email address by clicking the link below:',
      '',
      String(data['verificationLink'] ?? ''),
      '',
      'This link will expire in 24 hours. If you did not create an account, you can safely ignore this email.',
      '',
      'The Marketplace Team',
    ].join('\n'),
  }),

  'password-reset': (data) => ({
    subject: 'Reset your password',
    body: [
      `Hi ${String(data['displayName'] ?? 'there')},`,
      '',
      'We received a request to reset your password. Click the link below to choose a new password:',
      '',
      String(data['resetLink'] ?? ''),
      '',
      'This link will expire in 1 hour. If you did not request a password reset, you can safely ignore this email.',
      '',
      'The Marketplace Team',
    ].join('\n'),
  }),

  'listing-expired': (data) => ({
    subject: 'Your listing has expired',
    body: [
      `Hi ${String(data['displayName'] ?? 'there')},`,
      '',
      `Your listing "${String(data['listingTitle'] ?? '')}" has expired.`,
      '',
      'If you\'d like to relist it, click the link below:',
      '',
      String(data['renewLink'] ?? ''),
      '',
      'The Marketplace Team',
    ].join('\n'),
  }),

  'new-message': (data) => ({
    subject: `New message from ${String(data['senderName'] ?? 'someone')}`,
    body: [
      `Hi ${String(data['displayName'] ?? 'there')},`,
      '',
      `You have a new message from ${String(data['senderName'] ?? 'someone')} about "${String(data['listingTitle'] ?? '')}"`,
      '',
      `"${String(data['messagePreview'] ?? '')}"`,
      '',
      'Reply to this message:',
      String(data['chatLink'] ?? ''),
      '',
      'The Marketplace Team',
    ].join('\n'),
  }),

  'listing-approved': (data) => ({
    subject: 'Your listing is live!',
    body: [
      `Hi ${String(data['displayName'] ?? 'there')},`,
      '',
      `Great news! Your listing "${String(data['listingTitle'] ?? '')}" has been approved and is now live.`,
      '',
      'View your listing:',
      String(data['listingLink'] ?? ''),
      '',
      'The Marketplace Team',
    ].join('\n'),
  }),

  'listing-rejected': (data) => ({
    subject: 'Listing not approved',
    body: [
      `Hi ${String(data['displayName'] ?? 'there')},`,
      '',
      `Unfortunately, your listing "${String(data['listingTitle'] ?? '')}" was not approved.`,
      '',
      `Reason: ${String(data['reason'] ?? 'This listing does not meet our community guidelines.')}`,
      '',
      'If you believe this was a mistake, please contact our support team.',
      '',
      'The Marketplace Team',
    ].join('\n'),
  }),
};

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly transporter: Transporter;
  private readonly fromAddress: string;

  constructor(private readonly configService: ConfigService) {
    const smtpHost = this.configService.get<string>('SMTP_HOST');
    this.fromAddress = this.configService.get<string>(
      'SMTP_FROM',
      'noreply@marketplace.local',
    );

    if (smtpHost) {
      this.transporter = nodemailer.createTransport({
        host: smtpHost,
        port: this.configService.get<number>('SMTP_PORT', 587),
        secure: this.configService.get<number>('SMTP_PORT', 587) === 465,
        auth: this.buildSmtpAuth(),
      });
      this.logger.log(`Email transport configured: SMTP via ${smtpHost}`);
    } else {
      // Dev/test fallback: log emails as JSON instead of sending
      this.transporter = nodemailer.createTransport({
        jsonTransport: true,
      });
      this.logger.log(
        'Email transport configured: jsonTransport (dev mode, emails logged to console)',
      );
    }
  }

  /**
   * Send an email using a named template with interpolated data.
   *
   * @param to - Recipient email address
   * @param template - Template name (must match a key in TEMPLATES)
   * @param data - Template data for interpolation
   */
  async send(
    to: string,
    template: string,
    data: Record<string, unknown>,
  ): Promise<void> {
    const templateFn = TEMPLATES[template];
    if (!templateFn) {
      this.logger.error(
        `Unknown email template: "${template}". Available: ${Object.keys(TEMPLATES).join(', ')}`,
      );
      throw new Error(`Unknown email template: "${template}"`);
    }

    const { subject, body } = templateFn(data);

    try {
      const info: unknown = await this.transporter.sendMail({
        from: this.fromAddress,
        to,
        subject,
        text: body,
        html: this.textToHtml(body),
      });

      // In jsonTransport mode, nodemailer returns the message as JSON string
      if (typeof info === 'object' && info !== null && 'message' in info) {
        this.logger.debug(
          `[DEV] Email sent (jsonTransport): to=${to}, template=${template}`,
        );
        this.logger.verbose(
          `[DEV] Email content: ${JSON.stringify(info)}`,
        );
      } else {
        this.logger.log(
          `Email sent: to=${to}, template=${template}`,
        );
      }
    } catch (error: unknown) {
      const errMsg =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Failed to send email: to=${to}, template=${template}, error=${errMsg}`,
      );
      throw error;
    }
  }

  /**
   * Convert plain text to simple HTML (preserving line breaks).
   * This is intentionally minimal -- for rich HTML emails, consider
   * a dedicated template engine like MJML or React Email.
   */
  private textToHtml(text: string): string {
    const escaped = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');

    // Convert URLs to clickable links
    const withLinks = escaped.replace(
      /(https?:\/\/[^\s<]+)/g,
      '<a href="$1">$1</a>',
    );

    return `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333;">${withLinks.replace(/\n/g, '<br>')}</div>`;
  }

  private buildSmtpAuth():
    | { user: string; pass: string }
    | undefined {
    const user = this.configService.get<string>('SMTP_USER');
    const pass = this.configService.get<string>('SMTP_PASS');

    if (user && pass) {
      return { user, pass };
    }

    // No auth needed (e.g., local Mailpit)
    return undefined;
  }
}
