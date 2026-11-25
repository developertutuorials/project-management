import nodemailer from "nodemailer";
import "dotenv/config";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp-relay.brevo.com",
  port: parseInt(process.env.SMTP_PORT || "587", 10),
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export const sendEmail = async ({ to, subject, body }) => {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.log(`[NotificationService] (Mock Mode) Email would be sent to: ${to} | Subject: ${subject}`);
    return { mock: true, to, subject };
  }

  const response = await transporter.sendMail({
    from: process.env.SENDER_EMAIL || process.env.SMTP_USER,
    to,
    subject,
    html: body,
  });
  return response;
};

export default sendEmail;
