import { Injectable, Logger } from '@nestjs/common';
import { SesService } from './ses.service';
import { CustomEnvService } from '../../config/custom-env.service';
import { SendEmailDto } from '../dto/send-email.dto';

@Injectable()
export class SendMailService {
    private readonly logger = new Logger(SendMailService.name);
    private readonly fromEmail: string;
    constructor(
        private sesService: SesService,
        private customEnvService: CustomEnvService,
    ) {
        this.fromEmail = customEnvService.get<string>('AWS_SES_FROM_EMAIL');
    }

  async sendVerificationCodeForNewUser(username: string, code: string): Promise<void> {
    const appName = this.customEnvService.get<string>('APP_NAME');
    const subject = `[${appName}] Welcome! Here's your verification code`;
    const htmlBody = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .welcome { background-color: #895BF5; color: white; padding: 20px; border-radius: 5px; text-align: center; margin-bottom: 20px; }
        .code { font-size: 32px; font-weight: bold; color: #895BF5; text-align: center; padding: 20px; background-color: #f8f9fa; border-radius: 5px; margin: 20px 0; }
        .footer { margin-top: 30px; font-size: 12px; color: #666; }
    </style>
</head>
<body>
    <div class="container">
        <div class="welcome">
            <h2>Welcome to ${appName}!</h2>
        </div>
        <p>Hello,</p>
        <p>We're excited to have you join us! Let's get you started with protecting your email privacy.</p>
        <p>Your verification code is:</p>
        <div class="code">${code}</div>
        <p>This code will expire in <strong>5 minutes</strong>.</p>
        <p>If you did not request this code, please ignore this email.</p>
        <div class="footer">
            <p>Best regards,<br>${appName} Team</p>
        </div>
    </div>
</body>
</html>
    `.trim();

    const textBody = `
Welcome to ${appName}!

Hello,

We're excited to have you join us! Let's get you started with protecting your email privacy.

Your verification code is: ${code}

This code will expire in 5 minutes.

If you did not request this code, please ignore this email.

Best regards,
${appName} Team
    `.trim();

    await this.sendMail({
        to: username,
        from: this.fromEmail,
        subject,
        htmlBody,
        textBody
    });
  }

  async sendVerificationCodeForReturningUser(username: string, code: string): Promise<void> {
    const appName = this.customEnvService.get<string>('APP_NAME');
    const subject = `[${appName}] Welcome back! Here's your verification code`;
    const htmlBody = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .welcome-back { background-color: #895BF5; color: white; padding: 20px; border-radius: 5px; text-align: center; margin-bottom: 20px; }
        .code { font-size: 32px; font-weight: bold; color: #895BF5; text-align: center; padding: 20px; background-color: #f8f9fa; border-radius: 5px; margin: 20px 0; }
        .footer { margin-top: 30px; font-size: 12px; color: #666; }
    </style>
</head>
<body>
    <div class="container">
        <div class="welcome-back">
            <h2>Welcome Back!</h2>
        </div>
        <p>Hello,</p>
        <p>Great to see you again! Here's your verification code to continue:</p>
        <div class="code">${code}</div>
        <p>This code will expire in <strong>5 minutes</strong>.</p>
        <p>If you did not request this code, please ignore this email.</p>
        <div class="footer">
            <p>Best regards,<br>${appName} Team</p>
        </div>
    </div>
</body>
</html>
    `.trim();

    const textBody = `
Welcome Back!

Hello,

Great to see you again! Here's your verification code to continue:

Your verification code is: ${code}

This code will expire in 5 minutes.

If you did not request this code, please ignore this email.

Best regards,
${appName} Team
    `.trim();

    await this.sendMail({
        to: username,
        from: this.fromEmail,
        subject,
        htmlBody,
        textBody
    });
  }

  async sendWelcomeEmail(username: string): Promise<void> {
    const subject = `Welcome to ${this.customEnvService.get<string>('APP_NAME')}!`;
    const htmlBody = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .welcome { background-color: #007bff; color: white; padding: 30px; border-radius: 5px; text-align: center; }
        .content { padding: 20px 0; }
        .footer { margin-top: 30px; font-size: 12px; color: #666; }
    </style>
</head>
<body>
    <div class="container">
        <div class="welcome">
            <h1>Welcome to ${this.customEnvService.get<string>('APP_NAME')}!</h1>
        </div>
        <div class="content">
            <p>Hello,</p>
            <p>Your account has been successfully created. You can now start using our email relay service to protect your privacy.</p>
            <p>Thank you for choosing ${this.customEnvService.get<string>('APP_NAME')}!</p>
        </div>
        <div class="footer">
            <p>Best regards,<br>${this.customEnvService.get<string>('APP_NAME')} Team</p>
        </div>
    </div>
</body>
</html>
    `.trim();

    const textBody = `
Welcome to ${this.customEnvService.get<string>('APP_NAME')}!

Hello,

Your account has been successfully created. You can now start using our email relay service to protect your privacy.

Thank you for choosing ${this.customEnvService.get<string>('APP_NAME')}!

Best regards,
${this.customEnvService.get<string>('APP_NAME')} Team
    `.trim();

    await this.sendMail({
        to: username,
        from: this.fromEmail,
        subject,
        htmlBody,
        textBody
    });
  }

  async sendMail(dto: SendEmailDto): Promise<void> {
    await this.sesService.sendEmail(dto);
  }
}
