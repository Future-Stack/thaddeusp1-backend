import { Body, Controller, HttpException, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { MailService } from '../../mail/mail.service';
import { ContactUsDto } from './dto/contact-us.dto';
import { ConfigService } from '@nestjs/config';
import { ThrottlerGuard, Throttle } from '@nestjs/throttler';

@ApiTags('Contact')
@Controller('contact')
export class ContactController {
  constructor(
    private readonly mailService: MailService,
    private readonly configService: ConfigService,
  ) {}

  @Post()
  @UseGuards(ThrottlerGuard)
  @Throttle({ contact: { ttl: 3600, limit: 5 } })
  @ApiOperation({ summary: 'Send a contact email to admin' })
  @ApiResponse({ status: 201, description: 'Email sent successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 500, description: 'Email sending failed' })
  async sendContact(@Body() dto: ContactUsDto) {
    const adminEmail = this.configService.get<string>('ADMIN_CONTACT_EMAIL');
    if (!adminEmail) {
      throw new HttpException('Admin email not configured', HttpStatus.INTERNAL_SERVER_ERROR);
    }

    const subject = `[Wina Pizza] Contact Us: ${dto.subject}`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2>New Contact Message from Wina Pizza</h2>
        <p><strong>Name:</strong> ${dto.name}</p>
        <p><strong>Email:</strong> ${dto.email}</p>
        <p><strong>Subject:</strong> ${dto.subject}</p>
        <p><strong>Message:</strong></p>
        <p>${dto.message.replace(/\n/g, '<br/>')}</p>
      </div>
    `;
    try {
      await this.mailService.sendMail(adminEmail, subject, dto.message, html);
      return { message: 'Contact email sent' };
    } catch (error) {
      throw new HttpException('Failed to send email', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
