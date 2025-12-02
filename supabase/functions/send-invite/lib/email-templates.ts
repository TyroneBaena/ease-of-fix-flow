
import { EmailData } from "./types.ts";

export function createEmailHtml(data: EmailData): string {
  const { name, role, temporaryPassword, loginUrl, isNewUser, organizationName, inviterName } = data;
  
  console.log("Creating email HTML with data:", {
    to: data.to,
    name,
    role,
    loginUrl,
    isNewUser,
    hasTemporaryPassword: !!temporaryPassword,
    organizationName,
    inviterName
  });
  
  const orgDisplay = organizationName || 'HousingHub';
  const inviterDisplay = inviterName ? `by <strong>${inviterName}</strong> from ` : 'to join ';
  
  return isNewUser
    ? `
      <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background-color: #2563eb; padding: 20px; border-radius: 8px 8px 0 0; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 24px;">${orgDisplay}</h1>
            </div>
            <div style="background-color: #f8fafc; padding: 30px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 8px 8px;">
              <h2 style="color: #1e40af; margin-top: 0;">Welcome to HousingHub!</h2>
              <p>Hello ${name},</p>
              <p>You have been invited ${inviterDisplay}<strong>${orgDisplay}</strong> with the role of <strong>${role}</strong>.</p>
              <p>To get started, please use the following temporary password to set up your account:</p>
              <div style="background-color: #ffffff; padding: 15px; border-radius: 5px; margin: 20px 0; border: 1px solid #e2e8f0;">
                <p style="margin: 5px 0;"><strong>Email:</strong> ${data.to}</p>
                <p style="margin: 5px 0;"><strong>Temporary Password:</strong> ${temporaryPassword}</p>
              </div>
              <p>
                <a href="${loginUrl}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
                  Set Up Your Password
                </a>
              </p>
              <p style="color: #64748b; font-size: 14px;">For security reasons, we recommend changing this temporary password immediately after logging in.</p>
              <p style="color: #64748b; font-size: 12px;">If the button above doesn't work, copy and paste this URL into your browser:</p>
              <p style="word-break: break-all; font-size: 12px; color: #64748b;">${loginUrl}</p>
              <p>If you have any questions, please contact your administrator.</p>
              <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
              <p style="color: #64748b; font-size: 14px; margin-bottom: 0;">
                Best regards,<br>
                <strong>${orgDisplay} Team</strong>
              </p>
            </div>
          </div>
        </body>
      </html>
    `
    : `
      <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background-color: #2563eb; padding: 20px; border-radius: 8px 8px 0 0; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 24px;">${orgDisplay}</h1>
            </div>
            <div style="background-color: #f8fafc; padding: 30px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 8px 8px;">
              <h2 style="color: #1e40af; margin-top: 0;">You've Been Added to ${orgDisplay}!</h2>
              <p>Hello ${name},</p>
              <p>Great news! You have been added ${inviterDisplay}<strong>${orgDisplay}</strong> on HousingHub with the role of <strong>${role}</strong>.</p>
              <p>You can now access this organization's properties and maintenance requests using your existing login credentials.</p>
              ${role === 'manager' ? `<p style="background-color: #fef3c7; padding: 10px; border-radius: 5px; border-left: 4px solid #f59e0b;">As a manager, you'll have access to specific properties assigned to you within this organization.</p>` : ''}
              <p>
                <a href="${loginUrl}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
                  Login to Access Your New Organization
                </a>
              </p>
              <p style="color: #64748b; font-size: 14px;"><strong>Note:</strong> Use your existing email and password to log in. You can switch between organizations from your dashboard.</p>
              <p style="color: #64748b; font-size: 12px;">If the button above doesn't work, copy and paste this URL into your browser:</p>
              <p style="word-break: break-all; font-size: 12px; color: #64748b;">${loginUrl}</p>
              <p>If you have any questions about your new access, please contact your administrator.</p>
              <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
              <p style="color: #64748b; font-size: 14px; margin-bottom: 0;">
                Best regards,<br>
                <strong>${orgDisplay} Team</strong>
              </p>
            </div>
          </div>
        </body>
      </html>
    `;
}
