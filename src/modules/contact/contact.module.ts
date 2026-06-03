import { Module } from '@nestjs/common';
import { ContactController } from './contact.controller';
import { MailModule } from '../../mail/mail.module';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';

@Module({
  imports: [
    MailModule,
    ConfigModule,
    ThrottlerModule.forRoot({
      throttlers: [{ ttl: 3600, limit: 5 }],
    }),
  ],
  controllers: [ContactController],
})
export class ContactModule {}
