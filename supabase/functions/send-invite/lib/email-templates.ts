
import { EmailData } from "./types.ts";

export function createEmailHtml(data: EmailData): string {
  const { name, role, temporaryPassword, loginUrl, isNewUser } = data;
  
  console.log("Creating email HTML with data:", {
    to: data.to,
    name,
    role,
    loginUrl,
    isNewUser,
    hasTemporaryPassword: !!temporaryPassword
  });
  
  return isNewUser
    ? `
      <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2>Welcome to Property Manager!</h2>
            <p>Hello ${name},</p>
            <p>You have been invited to join Property Manager with the role of <strong>${role}</strong>.</p>
            <p>To get started, please use the following temporary password to set up your account:</p>
            <div style="background-color: #f4f4f4; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <p style="margin: 5px 0;"><strong>Email:</strong> ${data.to}</p>
              <p style="margin: 5px 0;"><strong>Temporary Password:</strong> ${temporaryPassword}</p>
            </div>
            <p>
              <a href="${loginUrl}" style="background-color: #4CAF50; color: white; padding: 10px 15px; text-decoration: none; border-radius: 5px; display: inline-block;">
                Set Up Your Password
              </a>
            </p>
            <p>For security reasons, we recommend changing this temporary password immediately after logging in.</p>
            <p>If the button above doesn't work, copy and paste this URL into your browser:</p>
            <p style="word-break: break-all; font-size: 12px;">${loginUrl}</p>
            <p>If you have any questions, please contact your administrator.</p>
            <p>Thank you,<br>Property Manager Team</p>
          </div>
        </body>
      </html>
    `
    : `
      <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2>You've Been Added to a New Organization!</h2>
            <p>Hello ${name},</p>
            <p>Great news! You have been added to a new organization in Property Manager with the role of <strong>${role}</strong>.</p>
            <p>You can now access this organization's properties and maintenance requests using your existing login credentials.</p>
            ${role === 'manager' ? `<p>As a manager, you'll have access to specific properties assigned to you within this organization.</p>` : ''}
            <p>
              <a href="${loginUrl}" style="background-color: #4CAF50; color: white; padding: 10px 15px; text-decoration: none; border-radius: 5px; display: inline-block;">
                Login to Access Your New Organization
              </a>
            </p>
            <p><strong>Note:</strong> Use your existing email and password to log in. You can switch between organizations from your dashboard.</p>
            <p>If the button above doesn't work, copy and paste this URL into your browser:</p>
            <p style="word-break: break-all; font-size: 12px;">${loginUrl}</p>
            <p>If you have any questions about your new access, please contact your administrator.</p>
            <p>Thank you,<br>Property Manager Team</p>
          </div>
        </body>
      </html>
    `;
}
