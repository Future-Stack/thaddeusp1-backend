import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { IEnv } from 'src/config/env.config';

@Injectable()
export class MailService {
  private transporter: nodemailer.Transporter;

  constructor(private readonly configService: ConfigService) {
    const config = this.configService.get<IEnv['SMTP_EMAIL_CONFIG']>('env.SMTP_EMAIL_CONFIG');

    this.transporter = nodemailer.createTransport({
      host: config?.EMAIL_HOST,
      port: parseInt(config?.EMAIL_PORT || '587', 10),
      secure: config?.EMAIL_PORT === '465', // true for 465, false for other ports
      auth: {
        user: config?.EMAIL_USER,
        pass: config?.EMAIL_PASSWORD,
      },
    });
  }

  async sendMail(to: string, subject: string, text: string, html?: string) {
    const config = this.configService.get<IEnv['SMTP_EMAIL_CONFIG']>('env.SMTP_EMAIL_CONFIG');

    try {
      const info = await this.transporter.sendMail({
        from: `"${config?.EMAIL_FROM_NAME}" <${config?.EMAIL_FROM}>`,
        to,
        subject,
        text,
        html: html || text,
      });

      return info;
    } catch (error) {
      console.error('Error sending email:', error);
      throw new InternalServerErrorException('Failed to send email');
    }
  }

  async sendOtp(to: string, otp: string) {
    const subject = 'Your Password Reset OTP';
    const text = `Your OTP for password reset is: ${otp}. It will expire in 10 minutes.`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
        <h2 style="color: #333;">Password Reset Request</h2>
        <p>Hello,</p>
        <p>You requested a password reset. Please use the following OTP to proceed:</p>
        <div style="background-color: #f4f4f4; padding: 15px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 5px; color: #007bff; border-radius: 5px; margin: 20px 0;">
          ${otp}
        </div>
        <p>This OTP will expire in <strong>10 minutes</strong>.</p>
        <p>If you did not request this, please ignore this email.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
        <p style="font-size: 12px; color: #888;">This is an automated email, please do not reply.</p>
      </div>
    `;

    return this.sendMail(to, subject, text, html);
  }
}
