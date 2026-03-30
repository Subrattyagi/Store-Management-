const nodemailer = require('nodemailer');

const createTransporter = () => {
    return nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: parseInt(process.env.EMAIL_PORT, 10),
        secure: process.env.EMAIL_PORT === '465',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
        },
    });
};

/**
 * Send welcome email with temporary credentials to a new employee
 * @param {string} fullName - Employee's full name
 * @param {string} email - Employee's email address
 * @param {string} tempPassword - Generated temporary password
 */
const sendWelcomeEmail = async (fullName, email, tempPassword) => {
    const transporter = createTransporter();

    const mailOptions = {
        from: process.env.EMAIL_FROM || `"Bhautiki Admin" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: 'Welcome to Bhautiki 🚀',
        html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Welcome to Bhautiki</title>
        </head>
        <body style="margin:0;padding:0;background-color:#f8fafc;font-family:'Inter',Arial,sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f8fafc;padding:40px 20px;">
            <tr>
              <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(15,23,42,0.08);">
                  
                  <!-- Header -->
                  <tr>
                    <td style="background:linear-gradient(135deg,#0f172a 0%,#1e293b 100%);padding:40px 48px;text-align:center;">
                      <h1 style="margin:0;color:#ffffff;font-size:28px;font-weight:700;letter-spacing:-0.5px;">Bhautiki</h1>
                      <p style="margin:8px 0 0;color:#94a3b8;font-size:14px;">Asset Management Platform</p>
                    </td>
                  </tr>
                  
                  <!-- Body -->
                  <tr>
                    <td style="padding:48px;">
                      <h2 style="margin:0 0 8px;color:#0f172a;font-size:22px;font-weight:600;">Welcome aboard, ${fullName}! 👋</h2>
                      <p style="margin:0 0 32px;color:#64748b;font-size:15px;line-height:1.6;">
                        Your account has been created by the admin. You can now access the Bhautiki platform using the credentials below.
                      </p>
                      
                      <!-- Credentials Box -->
                      <div style="background:#f1f5f9;border-radius:12px;padding:24px;margin-bottom:32px;">
                        <p style="margin:0 0 4px;color:#64748b;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.8px;">Your Login Credentials</p>
                        <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:16px;">
                          <tr>
                            <td style="padding:10px 0;border-bottom:1px solid #e2e8f0;">
                              <span style="color:#64748b;font-size:13px;">Email</span>
                              <span style="float:right;color:#0f172a;font-size:14px;font-weight:600;">${email}</span>
                            </td>
                          </tr>
                          <tr>
                            <td style="padding:10px 0;">
                              <span style="color:#64748b;font-size:13px;">Temporary Password</span>
                              <span style="float:right;color:#6366f1;font-size:16px;font-weight:700;font-family:monospace;letter-spacing:1px;">${tempPassword}</span>
                            </td>
                          </tr>
                        </table>
                      </div>
                      
                      <!-- Warning -->
                      <div style="background:#fef3c7;border-left:4px solid #f59e0b;border-radius:0 8px 8px 0;padding:16px 20px;margin-bottom:32px;">
                        <p style="margin:0;color:#92400e;font-size:14px;font-weight:500;">
                          ⚠️ Please log in and reset your password immediately. This temporary password is for one-time use only.
                        </p>
                      </div>
                      
                      <p style="margin:0;color:#94a3b8;font-size:13px;line-height:1.6;">
                        If you did not expect this email or have questions, please contact your administrator.
                      </p>
                    </td>
                  </tr>
                  
                  <!-- Footer -->
                  <tr>
                    <td style="background:#f8fafc;padding:24px 48px;text-align:center;border-top:1px solid #e2e8f0;">
                      <p style="margin:0;color:#94a3b8;font-size:12px;">
                        © ${new Date().getFullYear()} Bhautiki. All rights reserved.
                      </p>
                    </td>
                  </tr>
                  
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
        `,
        text: `
Hello ${fullName},

Welcome to Bhautiki!

Your account has been created by the admin.

Here are your login credentials:
Email: ${email}
Temporary Password: ${tempPassword}

Please log in and reset your password immediately.

© ${new Date().getFullYear()} Bhautiki. All rights reserved.
        `.trim(),
    };

    await transporter.sendMail(mailOptions);
};

module.exports = { sendWelcomeEmail };
