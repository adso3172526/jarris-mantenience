import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private transporter: nodemailer.Transporter;

  constructor(private readonly config: ConfigService) {
    const host = this.config.get<string>('SMTP_HOST');
    const port = Number(this.config.get<string>('SMTP_PORT'));
    const user = this.config.get<string>('SMTP_USER');
    const pass = this.config.get<string>('SMTP_PASS');

    this.transporter = nodemailer.createTransport({
  host,
  port,
  secure: port === 465, // 465 = true, 587 = false
  auth: { user, pass },
});

  }

  async sendWorkOrderAssigned(params: {
    to: string;
    subject: string;
    text: string;
    html?: string;
  }) {
    const from = this.config.get<string>('SMTP_FROM') || 'no-reply@jarris.local';

    await this.transporter.sendMail({
      from,
      to: params.to,
      subject: params.subject,
      text: params.text,
      html: params.html, // ⭐ Soporte para HTML
    });

    return { ok: true };
  }
}
