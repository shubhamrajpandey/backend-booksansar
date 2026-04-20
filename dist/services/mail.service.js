"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendRiderRejectionEmail = exports.sendRiderApprovalEmail = void 0;
const nodemailer_1 = __importDefault(require("nodemailer"));
const transport = nodemailer_1.default.createTransport({
    service: "gmail",
    auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_PASS,
    },
});
const sendEmail = async (to, subject, text, html) => {
    try {
        const info = await transport.sendMail({
            from: `"BookSansar" <${process.env.GMAIL_USER}>`,
            to,
            subject,
            text,
            html: html || `<p>${text}</p>`,
        });
        console.log("Email sent successfully:", info.messageId);
        return info;
    }
    catch (error) {
        console.error("Failed to send email:", error);
        throw new Error("Email sending failed");
    }
};
// ─────────────────────────────────────────────────────────────
// ADD BELOW YOUR EXISTING sendEmail function
// ─────────────────────────────────────────────────────────────
const sendRiderApprovalEmail = async ({ to, name, tempPassword, }) => {
    const subject = "🎉 Your BookSansar Rider Application is Approved!";
    const text = `Hi ${name}, your BookSansar Rider application has been approved! Your login credentials: Email: ${to} | Temporary Password: ${tempPassword}. Please change your password after first login.`;
    const html = `
    <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; background: #fff; border-radius: 12px; overflow: hidden; border: 1px solid #f0e0cc;">
      <div style="background: #C17100; padding: 32px 24px; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 24px;">BookSansar</h1>
        <p style="color: #ffe0b0; margin: 8px 0 0; font-size: 14px;">Rider Portal</p>
      </div>

      <div style="padding: 32px 24px;">
        <h2 style="color: #1a1a1a; font-size: 20px; margin-bottom: 8px;">
          Congratulations, ${name}! 🎉
        </h2>
        <p style="color: #555; font-size: 15px; line-height: 1.6; margin-bottom: 24px;">
          Your application to become a BookSansar Rider has been
          <strong style="color: #C17100;">approved</strong>.
          Log in to the BookSansar Rider app to start accepting deliveries.
        </p>

        <div style="background: #FFF4E5; border: 1px solid #f5d9a0; border-radius: 10px; padding: 20px; margin-bottom: 24px;">
          <p style="color: #8a5200; font-size: 13px; font-weight: 600; margin: 0 0 12px; text-transform: uppercase; letter-spacing: 0.5px;">
            Your Login Credentials
          </p>
          <table style="width: 100%; font-size: 14px;">
            <tr>
              <td style="color: #888; padding: 6px 0; width: 120px;">Email</td>
              <td style="color: #1a1a1a; font-weight: 600;">${to}</td>
            </tr>
            <tr>
              <td style="color: #888; padding: 6px 0;">Password</td>
              <td style="color: #C17100; font-weight: 700; font-size: 20px; letter-spacing: 3px;">${tempPassword}</td>
            </tr>
          </table>
        </div>

        <div style="background: #fff8e1; border-left: 3px solid #C17100; padding: 12px 16px; border-radius: 0 8px 8px 0; margin-bottom: 24px;">
          <p style="color: #7a4e00; font-size: 13px; margin: 0; line-height: 1.5;">
            ⚠️ This is a temporary password. Please change it immediately after your first login from Profile → Settings in the app.
          </p>
        </div>

        <p style="color: #555; font-size: 14px; font-weight: 600; margin-bottom: 10px;">Next Steps:</p>
        <ol style="color: #666; font-size: 14px; line-height: 1.9; padding-left: 20px; margin-bottom: 24px;">
          <li>Download the <strong>BookSansar Rider</strong> app on your phone</li>
          <li>Log in with the credentials above</li>
          <li>Change your password from Profile → Settings</li>
          <li>Toggle yourself <strong>Online</strong> to start receiving orders</li>
        </ol>

        <p style="color: #888; font-size: 13px; line-height: 1.6;">
          Need help? Contact us at
          <a href="mailto:hello.booksansar@gmail.com" style="color: #C17100;">hello.booksansar@gmail.com</a>
        </p>
      </div>

      <div style="background: #f9f9f9; padding: 16px 24px; text-align: center; border-top: 1px solid #f0e0cc;">
        <p style="color: #aaa; font-size: 12px; margin: 0;">
          © ${new Date().getFullYear()} BookSansar — Nepal's Home for Books & Readers
        </p>
      </div>
    </div>
  `;
    return sendEmail(to, subject, text, html);
};
exports.sendRiderApprovalEmail = sendRiderApprovalEmail;
const sendRiderRejectionEmail = async ({ to, name, reason, }) => {
    const subject = "BookSansar Rider Application Update";
    const text = `Hi ${name}, thank you for applying to be a BookSansar Rider. Unfortunately we are unable to move forward at this time. Reason: ${reason}. You are welcome to re-apply in the future.`;
    const html = `
    <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; background: #fff; border-radius: 12px; overflow: hidden; border: 1px solid #eee;">
      <div style="background: #C17100; padding: 32px 24px; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 24px;">BookSansar</h1>
        <p style="color: #ffe0b0; margin: 8px 0 0; font-size: 14px;">Rider Portal</p>
      </div>

      <div style="padding: 32px 24px;">
        <h2 style="color: #1a1a1a; font-size: 20px; margin-bottom: 8px;">Hi ${name},</h2>
        <p style="color: #555; font-size: 15px; line-height: 1.6; margin-bottom: 20px;">
          Thank you for your interest in joining BookSansar as a rider.
          After reviewing your application, we are unable to move forward at this time.
        </p>

        ${reason
        ? `
        <div style="background: #f9f9f9; border-radius: 10px; padding: 16px; margin-bottom: 20px; border: 1px solid #eee;">
          <p style="color: #888; font-size: 12px; margin: 0 0 6px; text-transform: uppercase; font-weight: 600; letter-spacing: 0.5px;">Reason</p>
          <p style="color: #444; font-size: 14px; margin: 0; line-height: 1.6;">${reason}</p>
        </div>
        `
        : ""}

        <p style="color: #555; font-size: 14px; line-height: 1.6; margin-bottom: 20px;">
          You are welcome to re-apply in the future if your circumstances change.
          We appreciate your time and wish you all the best.
        </p>

        <p style="color: #888; font-size: 13px;">
          Questions? Reach us at
          <a href="mailto:hello.booksansar@gmail.com" style="color: #C17100;">hello.booksansar@gmail.com</a>
        </p>
      </div>

      <div style="background: #f9f9f9; padding: 16px 24px; text-align: center; border-top: 1px solid #eee;">
        <p style="color: #aaa; font-size: 12px; margin: 0;">
          © ${new Date().getFullYear()} BookSansar — Nepal's Home for Books & Readers
        </p>
      </div>
    </div>
  `;
    return sendEmail(to, subject, text, html);
};
exports.sendRiderRejectionEmail = sendRiderRejectionEmail;
exports.default = sendEmail;
