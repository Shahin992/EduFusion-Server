import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  async sendPasswordResetEmail(email: string, name: string, resetUrl: string) {
    const sendgridApiKey = process.env.SENDGRID_API_KEY;
    if (sendgridApiKey) {
      try {
        await fetch('https://api.sendgrid.com/v3/mail/send', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${sendgridApiKey}`,
          },
          body: JSON.stringify({
            personalizations: [
              {
                to: [{ email }],
                subject: 'Password Reset Request',
              }
            ],
            from: { 
              email: process.env.MAIL_FROM || 'support@edufusion.com',
              name: 'EduFusionbd'
            },
            content: [
              {
                type: 'text/html',
                value: `
                  <div style="background-color: #f8fafc; padding: 40px 20px; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;">
                    <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0, 0, 0, 0.05);">
                      
                      <!-- Header -->
                      <div style="background-color: #ffffff; padding: 30px 40px; text-align: center; border-bottom: 1px solid #f1f5f9;">
                        <!-- Replace the src with your actual hosted logo URL -->
                        <h1 style="color: #6475f7; margin: 0; font-size: 28px; font-weight: 800; letter-spacing: -0.5px;">EduFusion</h1>
                      </div>

                      <!-- Body -->
                      <div style="padding: 40px;">
                        <h2 style="color: #1e293b; font-size: 22px; margin-top: 0; margin-bottom: 24px; font-weight: 700;">Password Reset Request</h2>
                        <p style="color: #475569; font-size: 16px; line-height: 1.6; margin-bottom: 20px; font-weight: 500;">Hi ${name},</p>
                        <p style="color: #475569; font-size: 16px; line-height: 1.6; margin-bottom: 30px;">We received a request to reset the password for your EduFusion account. If you made this request, please click the button below to set a new password:</p>
                        
                        <div style="text-align: center; margin-bottom: 35px;">
                          <a href="${resetUrl}" style="display: inline-block; padding: 14px 32px; background-color: #6475f7; color: #ffffff; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 6px rgba(100, 117, 247, 0.25);">Reset Password</a>
                        </div>
                        
                        <p style="color: #64748b; font-size: 14px; line-height: 1.6; margin-bottom: 20px;">
                          <strong>Security Notice:</strong> This secure link will expire in exactly <strong>10 minutes</strong>. 
                        </p>
                        <p style="color: #64748b; font-size: 14px; line-height: 1.6; margin-bottom: 0;">
                          If you did not request a password reset, you can safely ignore this email. Your password will remain unchanged and your account is secure.
                        </p>
                      </div>

                      <!-- Footer -->
                      <div style="background-color: #f8fafc; padding: 24px 40px; text-align: center; border-top: 1px solid #f1f5f9;">
                        <p style="color: #94a3b8; font-size: 13px; margin: 0 0 8px 0; font-weight: 500;">&copy; ${new Date().getFullYear()} EduFusion Bangladesh. All rights reserved.</p>
                        <p style="color: #94a3b8; font-size: 12px; margin: 0;">Empowering education through next-generation technology.</p>
                      </div>
                      
                    </div>
                  </div>
                `
              }
            ]
          })
        });
        this.logger.log(`Password reset email sent to ${email} via SendGrid`);
      } catch (err) {
        this.logger.error('Failed to send email via SendGrid:', err);
      }
    } else {
      this.logger.warn(`SENDGRID_API_KEY is not set. Reset URL is: ${resetUrl}`);
    }
  }
}
