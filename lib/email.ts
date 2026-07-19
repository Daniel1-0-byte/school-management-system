import { Resend } from 'resend';

const DEFAULT_FROM_EMAIL = 'onboarding@resend.dev';
const CUSTOM_FROM_EMAIL = process.env.RESEND_FROM_EMAIL;

// Initialize Resend lazily to avoid build-time issues
let resendClient: Resend | null = null;

function getResendClient(): Resend {
  if (!resendClient) {
    const apiKey = process.env.RESEND_API_KEY;
    console.log('[v0] Initializing Resend client:', {
      apiKeyExists: !!apiKey,
      customFromEmail: CUSTOM_FROM_EMAIL,
      defaultFromEmail: DEFAULT_FROM_EMAIL,
    });
    if (!apiKey) {
      throw new Error('RESEND_API_KEY environment variable is not set');
    }
    resendClient = new Resend(apiKey);
  }
  return resendClient;
}

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail({ to, subject, html }: EmailOptions) {
  try {
    // Try custom email first, fall back to default if domain not verified
    let fromEmail = CUSTOM_FROM_EMAIL || DEFAULT_FROM_EMAIL;

    console.log('[v0] Sending email:', {
      to,
      subject,
      from: fromEmail,
      isCustomDomain: !!CUSTOM_FROM_EMAIL,
      timestamp: new Date().toISOString(),
    });

    const resend = getResendClient();
    let response = await resend.emails.send({
      from: fromEmail,
      to,
      subject,
      html,
    });

    // If custom domain fails due to verification, retry with default
    if (
      response.error &&
      CUSTOM_FROM_EMAIL &&
      response.error.message?.includes('domain is not verified')
    ) {
      console.log('[v0] Custom domain not verified, falling back to default:', {
        customDomain: fromEmail,
        fallback: DEFAULT_FROM_EMAIL,
        error: response.error.message,
      });

      fromEmail = DEFAULT_FROM_EMAIL;
      response = await resend.emails.send({
        from: fromEmail,
        to,
        subject,
        html,
      });
    }

    console.log('[v0] Email send response:', {
      error: response.error || null,
      id: response.data?.id || null,
      success: !response.error,
      from: fromEmail,
    });

    if (response.error) {
      console.error('[v0] Email send failed:', {
        error: response.error,
        to,
        from: fromEmail,
      });
      return { success: false, error: response.error };
    }

    console.log('[v0] Email sent successfully:', {
      id: response.data?.id,
      to,
      from: fromEmail,
      note: CUSTOM_FROM_EMAIL && fromEmail === DEFAULT_FROM_EMAIL ? 'Used fallback domain' : 'Used configured domain',
    });
    return { success: true, data: response.data };
  } catch (error) {
    console.error('[v0] Email service error:', {
      error: error instanceof Error ? error.message : String(error),
      to,
      customFromEmail: CUSTOM_FROM_EMAIL,
      fallbackFromEmail: DEFAULT_FROM_EMAIL,
      stack: error instanceof Error ? error.stack : undefined,
    });
    return { success: false, error };
  }
}

// Email templates
export function getEmailVerificationTemplate(verificationLink: string, schoolName: string) {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px; }
          .button { background: #667eea; color: white; padding: 12px 24px; border-radius: 4px; text-decoration: none; display: inline-block; margin: 20px 0; }
          .footer { margin-top: 20px; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Verify Your Email</h1>
          </div>
          <div class="content">
            <p>Hi,</p>
            <p>Thank you for signing up <strong>${schoolName}</strong> on our school management platform!</p>
            <p>To complete your registration, please verify your email address by clicking the button below:</p>
            <a href="${verificationLink}" class="button">Verify Email</a>
            <p>Or copy and paste this link in your browser:</p>
            <p style="word-break: break-all; color: #667eea;"><small>${verificationLink}</small></p>
            <p>This link will expire in 24 hours.</p>
            <p>If you didn't create this account, please ignore this email.</p>
            <div class="footer">
              <p>© 2026 School Management System. All rights reserved.</p>
            </div>
          </div>
        </div>
      </body>
    </html>
  `;
}

export function getStaffInvitationTemplate(
  staffName: string,
  schoolName: string,
  invitationLink: string,
  role: string
) {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px; }
          .button { background: #667eea; color: white; padding: 12px 24px; border-radius: 4px; text-decoration: none; display: inline-block; margin: 20px 0; }
          .footer { margin-top: 20px; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>You've Been Invited to ${schoolName}</h1>
          </div>
          <div class="content">
            <p>Hi ${staffName},</p>
            <p>You have been invited to join <strong>${schoolName}</strong> as a <strong>${role}</strong>.</p>
            <p>Click the button below to accept the invitation and set up your account:</p>
            <a href="${invitationLink}" class="button">Accept Invitation</a>
            <p>Or copy and paste this link in your browser:</p>
            <p style="word-break: break-all; color: #667eea;"><small>${invitationLink}</small></p>
            <p>This invitation will expire in 7 days.</p>
            <p>If you have any questions, please contact your school administrator.</p>
            <div class="footer">
              <p>© 2026 School Management System. All rights reserved.</p>
            </div>
          </div>
        </div>
      </body>
    </html>
  `;
}

export function getSchoolApprovalNotificationTemplate(schoolName: string, adminEmail: string) {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px; }
          .button { background: #22c55e; color: white; padding: 12px 24px; border-radius: 4px; text-decoration: none; display: inline-block; margin: 20px 0; }
          .footer { margin-top: 20px; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Your School Has Been Approved!</h1>
          </div>
          <div class="content">
            <p>Hi,</p>
            <p>Your school <strong>${schoolName}</strong> has been approved and is now active on our platform!</p>
            <p>Your admin account has been automatically provisioned with default academic structure. You can now:</p>
            <ul>
              <li>Configure school settings and details</li>
              <li>Invite teachers and staff members</li>
              <li>Create and manage classes</li>
              <li>Enroll students</li>
            </ul>
            <p>The admin dashboard will help you get started.</p>
            <div class="footer">
              <p>© 2026 School Management System. All rights reserved.</p>
            </div>
          </div>
        </div>
      </body>
    </html>
  `;
}
