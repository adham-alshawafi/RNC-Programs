import express from "express";
import path from "path";
import dotenv from "dotenv";
import nodemailer from "nodemailer";
import { createServer as createViteServer } from "vite";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Parse JSON bodies
  app.use(express.json());

  // API routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", service: "Attendance Tracker Backend" });
  });

  app.post("/api/send-reset-email", async (req, res) => {
    const { email, token, fullName } = req.body;

    if (!email || !token) {
      res.status(400).json({ success: false, error: "Missing email or token parameter" });
      return;
    }

    // Read SMTP Configuration
    const smtpHost = process.env.SMTP_HOST;
    const smtpPort = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT) : 587;
    const smtpUser = process.env.SMTP_USER;
    const smtpPassword = process.env.SMTP_PASSWORD;
    const smtpFrom = process.env.SMTP_FROM || `"Attendance Security" <no-reply@classroom-attendance.example.com>`;

    const resetLink = `${process.env.APP_URL || "http://localhost:3000"}/?resetToken=${token}`;

    console.log(`[Email Request Received] To: ${email}, Token: ${token}, Name: ${fullName}`);

    // If SMTP is not configured, reply with status but also simulate so developer knows what happened
    if (!smtpHost || !smtpUser || !smtpPassword) {
      console.warn("⚠️ SMTP Host, User, or Password is missing in environment variables. Email could not be sent programmatically.");
      res.status(200).json({
        success: false,
        simulated: true,
        error: "SMTP credentials not configured in host environment variables.",
        token,
        resetLink,
        message: "No SMTP configuration found in environment. Please add SMTP_HOST, SMTP_USER, SMTP_PASSWORD to your Settings/Secrets in AI Studio to send genuine emails."
      });
      return;
    }

    try {
      // Create transport
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465, // true for 465, false for other ports
        auth: {
          user: smtpUser,
          pass: smtpPassword,
        },
      });

      // Construct mail option
      const mailOptions = {
        from: smtpFrom,
        to: email,
        subject: "🔐 Classroom Attendance Tracker - Password Reset Verification Code",
        text: `Hello ${fullName || "Academic Officer"},\n\nWe received a password reset request for your account on Classroom Attendance Tracker.\n\nYour security token is: ${token}\n\nYou can input this token directly into the security code form in the app, or click the direct URL below reset your password:\n\n${resetLink}\n\nThis code and link are temporary. If you did not initiate this request, you can safely ignore this email.\n\nBest regards,\nClassroom Attendance Portal`,
        html: `
          <div style="font-family: 'Inter', sans-serif; max-width: 580px; margin: 0 auto; padding: 24px; border: 1px solid #f1f5f9; border-radius: 16px; background-color: #ffffff; color: #1e293b;">
            <div style="text-align: center; margin-bottom: 24px;">
              <div style="display: inline-block; padding: 12px; background-color: #f5f3ff; border-radius: 12px;">
                <span style="font-size: 24px; line-height: 1;">🔐</span>
              </div>
              <h2 style="font-size: 20px; font-weight: 800; color: #1e2a38; margin: 12px 0 0 0; letter-spacing: -0.025em;">Password Reset Requested</h2>
              <p style="font-size: 13px; color: #64748b; margin: 4px 0 0 0;">Classroom Attendance Management Portal</p>
            </div>
            
            <p style="font-size: 14px; line-height: 1.6; margin: 0 0 16px 0;">
              Hello <strong>${fullName || "Academic Officer"}</strong>,
            </p>
            <p style="font-size: 14px; line-height: 1.6; margin: 0 0 24px 0; color: #334155;">
              We received an request to reset your master login credentials. Please use the secure, one-time verification token below to create a new password.
            </p>
            
            <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; text-align: center; margin-bottom: 24px;">
              <span style="display: block; font-size: 10px; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 6px;">Your Security Code</span>
              <code style="font-family: monospace; font-size: 24px; font-weight: 800; letter-spacing: 0.05em; color: #4f46e5;">${token}</code>
            </div>

            <div style="text-align: center; margin-bottom: 24px;">
              <a href="${resetLink}" target="_blank" style="display: inline-block; background-color: #4f46e5; color: #ffffff; font-weight: 700; font-size: 13px; padding: 12px 24px; text-decoration: none; border-radius: 12px; box-shadow: 0 4px 12px rgba(79, 70, 229, 0.15);">
                Click to Reset Password Instantly
              </a>
            </div>

            <p style="font-size: 11px; color: #64748b; line-height: 1.5; margin: 24px 0 0 0; border-top: 1px solid #f1f5f9; padding-top: 16px; text-align: center;">
              This link and token are valid for 1 hour. If you did not make this request, you can safely disregard this automatic message. Done with security standards.
            </p>
          </div>
        `
      };

      await transporter.sendMail(mailOptions);
      console.log(`[Mail Sent Successfully] To: ${email}`);
      res.status(200).json({ success: true, message: "Verification email successfully delivered." });
    } catch (err: any) {
      console.error("❌ Nodemailer failed to send email:", err);
      res.status(500).json({ success: false, error: err.message || "Failed to dispatch email helper" });
    }
  });

  // Vite middleware for development mode
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server successfully started running on host 0.0.0.0, port ${PORT}`);
  });
}

startServer();
