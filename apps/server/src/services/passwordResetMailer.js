import nodemailer from "nodemailer";

const DEFAULT_FROM = '"BH Market Imo" <no-reply@bh-market.tn>';

let cachedTransporter = null;

function getMailConfig() {
  const host = String(process.env.SMTP_HOST || process.env.MAIL_HOST || "").trim();
  const port = Number(process.env.SMTP_PORT || process.env.MAIL_PORT || 587);
  const user = String(process.env.SMTP_USER || process.env.MAIL_USER || "").trim();
  const pass = String(process.env.SMTP_PASS || process.env.MAIL_PASS || "").trim();
  const secureValue = String(process.env.SMTP_SECURE || process.env.MAIL_SECURE || "").trim();
  const from = String(process.env.MAIL_FROM || process.env.SMTP_FROM || DEFAULT_FROM).trim();

  return {
    host,
    port,
    user,
    pass,
    secure: secureValue ? ["1", "true", "yes"].includes(secureValue.toLowerCase()) : port === 465,
    from,
  };
}

function getTransporter() {
  const config = getMailConfig();

  if (!config.host) {
    return null;
  }

  if (cachedTransporter) {
    return cachedTransporter;
  }

  cachedTransporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: config.user ? { user: config.user, pass: config.pass } : undefined,
  });

  return cachedTransporter;
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function isPasswordResetMailConfigured() {
  return Boolean(getMailConfig().host);
}

export function buildPasswordResetMessage({ user, resetUrl, expiresInMinutes }) {
  const displayName = user?.name || user?.email || "client";
  const subject = "Reinitialisation de votre mot de passe BH Market Imo";
  const text = [
    `Bonjour ${displayName},`,
    "",
    "Nous avons recu une demande de reinitialisation de votre mot de passe BH Market Imo.",
    `Cliquez sur ce lien pour choisir un nouveau mot de passe : ${resetUrl}`,
    "",
    `Ce lien expire dans ${expiresInMinutes} minutes.`,
    "Si vous n'etes pas a l'origine de cette demande, vous pouvez ignorer ce message.",
  ].join("\n");

  const safeName = escapeHtml(displayName);
  const safeUrl = escapeHtml(resetUrl);

  const html = `
    <div style="font-family:Arial,sans-serif;background:#f3f6fb;padding:28px;color:#0a2442">
      <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:14px;padding:28px;border-top:4px solid #e60000">
        <h1 style="font-size:24px;margin:0 0 12px;color:#061b35">Changer votre mot de passe</h1>
        <p style="font-size:15px;line-height:1.6;margin:0 0 18px">Bonjour ${safeName},</p>
        <p style="font-size:15px;line-height:1.6;margin:0 0 22px">
          Nous avons recu une demande de reinitialisation de votre mot de passe BH Market Imo.
        </p>
        <p style="margin:28px 0">
          <a href="${safeUrl}" style="display:inline-block;background:#e60000;color:#ffffff;text-decoration:none;font-weight:700;padding:14px 22px;border-radius:8px">
            Definir un nouveau mot de passe
          </a>
        </p>
        <p style="font-size:14px;line-height:1.6;margin:0 0 16px;color:#52657a">
          Ce lien expire dans ${expiresInMinutes} minutes. Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur :
        </p>
        <p style="font-size:13px;line-height:1.5;word-break:break-all;margin:0 0 22px;color:#0a4b8f">${safeUrl}</p>
        <p style="font-size:13px;line-height:1.5;margin:0;color:#6b7c90">
          Si vous n'etes pas a l'origine de cette demande, vous pouvez ignorer ce message.
        </p>
      </div>
    </div>
  `;

  return { subject, text, html };
}

export async function sendPasswordResetEmail({ user, resetUrl, expiresInMinutes }) {
  const transporter = getTransporter();
  const config = getMailConfig();
  const message = buildPasswordResetMessage({ user, resetUrl, expiresInMinutes });

  if (!transporter) {
    console.info("[password-reset] SMTP not configured. Development reset link:", resetUrl);
    return { delivered: false, reason: "smtp_not_configured" };
  }

  const info = await transporter.sendMail({
    from: config.from,
    to: user.email,
    subject: message.subject,
    text: message.text,
    html: message.html,
  });

  return { delivered: true, messageId: info.messageId };
}
