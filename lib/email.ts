import nodemailer from "nodemailer";
import { Resend } from "resend";

// ─── Clients (lazy) ───────────────────────────────────────────────────────────

function getTransporter() {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) return null;
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: Number(process.env.SMTP_PORT || 465),
    secure: process.env.SMTP_SECURE === "false" ? false : true,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS.replace(/\s+/g, ""),
    },
  });
}

function getResend(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  return new Resend(key);
}

const FROM =
  process.env.EMAIL_FROM ||
  (process.env.SMTP_USER ? `AfroMix <${process.env.SMTP_USER}>` : "AfroMix <onboarding@resend.dev>");
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

// ─── Échappement HTML ─────────────────────────────────────────────────────────
// Toute valeur venant d'un utilisateur (nom, message, titre…) est échappée avant
// d'entrer dans le HTML d'un e-mail : sinon un visiteur pourrait injecter des liens
// ou du balisage (hameçonnage) dans l'e-mail reçu par le DJ.
function esc(value: string | null | undefined): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SendResult {
  ok: boolean;
  error?: string;
}

// ─── Templates ───────────────────────────────────────────────────────────────

function verifyEmailHtml(displayName: string, code: string): string {
  return `
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:Inter,Helvetica,Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:40px 20px">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#111;border-radius:12px;overflow:hidden">
        <!-- Header -->
        <tr><td style="background:linear-gradient(135deg,#9333EA,#DB2777);padding:32px;text-align:center">
          <img src="${APP_URL}/brand/afromix-logo-white.png" alt="AfroMix" width="150" height="48" style="display:block;margin:0 auto;border:0;outline:none;height:48px;width:150px">
          <p style="margin:8px 0 0;color:rgba(255,255,255,0.8);font-size:14px">La plateforme des DJs africains</p>
        </td></tr>
        <!-- Body -->
        <tr><td style="padding:40px 32px">
          <h2 style="margin:0 0 16px;color:#fff;font-size:20px">Bienvenue, ${esc(displayName)}</h2>
          <p style="margin:0 0 24px;color:#a1a1aa;font-size:15px;line-height:1.6">
            Voici ton code pour confirmer ton adresse email et activer ton compte AfroMix :
          </p>
          <table cellpadding="0" cellspacing="0" width="100%"><tr><td align="center" style="padding:8px 0 28px">
            <div style="display:inline-block;background:#18181b;border:1px solid #3f3f46;border-radius:12px;padding:18px 28px;font-family:'SFMono-Regular',Consolas,'Liberation Mono',monospace;font-size:34px;font-weight:700;letter-spacing:10px;color:#fff">
              ${esc(code)}
            </div>
          </td></tr></table>
          <p style="margin:0;color:#71717a;font-size:13px">
            Ce code expire dans <strong style="color:#a1a1aa">10 minutes</strong>. Ne le partage avec personne :
            l'équipe AfroMix ne te le demandera jamais.
          </p>
        </td></tr>
        <!-- Footer -->
        <tr><td style="border-top:1px solid #222;padding:24px 32px;text-align:center">
          <p style="margin:0;color:#52525b;font-size:12px">
            Si tu n'as pas créé de compte AfroMix, ignore cet email.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function resetPasswordHtml(displayName: string, resetUrl: string): string {
  return `
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:Inter,Helvetica,Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:40px 20px">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#111;border-radius:12px;overflow:hidden">
        <tr><td style="background:linear-gradient(135deg,#9333EA,#DB2777);padding:32px;text-align:center">
          <img src="${APP_URL}/brand/afromix-logo-white.png" alt="AfroMix" width="150" height="48" style="display:block;margin:0 auto;border:0;outline:none;height:48px;width:150px">
          <p style="margin:8px 0 0;color:rgba(255,255,255,0.8);font-size:14px">La plateforme des DJs africains</p>
        </td></tr>
        <tr><td style="padding:40px 32px">
          <h2 style="margin:0 0 16px;color:#fff;font-size:20px">Réinitialisation du mot de passe</h2>
          <p style="margin:0 0 8px;color:#a1a1aa;font-size:15px">Bonjour ${esc(displayName)},</p>
          <p style="margin:0 0 24px;color:#a1a1aa;font-size:15px;line-height:1.6">
            Tu as demandé à réinitialiser ton mot de passe. Clique sur le bouton ci-dessous pour en choisir un nouveau.
          </p>
          <table cellpadding="0" cellspacing="0" width="100%"><tr><td align="center" style="padding:8px 0 32px">
            <a href="${esc(resetUrl)}" style="display:inline-block;background:linear-gradient(135deg,#9333EA,#DB2777);color:#fff;text-decoration:none;padding:14px 32px;border-radius:8px;font-size:15px;font-weight:600">
              Réinitialiser mon mot de passe
            </a>
          </td></tr></table>
          <p style="margin:0 0 8px;color:#71717a;font-size:13px">
            Ce lien expire dans <strong style="color:#a1a1aa">1 heure</strong>.
          </p>
          <p style="margin:0;color:#52525b;font-size:12px">
            Si tu n'as pas demandé cette réinitialisation, ignore cet email — ton mot de passe reste inchangé.
          </p>
        </td></tr>
        <tr><td style="border-top:1px solid #222;padding:24px 32px;text-align:center">
          <p style="margin:0;color:#52525b;font-size:12px">AfroMix — La plateforme des DJs africains</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// ─── Send helpers ─────────────────────────────────────────────────────────────

async function sendMail(
  to: string,
  subject: string,
  html: string,
  logContext: string
): Promise<SendResult> {
  const transporter = getTransporter();
  if (transporter) {
    try {
      await transporter.sendMail({
        from: FROM,
        to,
        subject,
        html,
      });
      console.log(`[Email] ${logContext} sent successfully via SMTP to ${to}`);
      return { ok: true };
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      console.error(`[Email] SMTP error (${logContext}):`, err);
      return { ok: false, error: errorMsg };
    }
  }

  const resend = getResend();
  if (resend) {
    try {
      const { error } = await resend.emails.send({
        from: FROM,
        to,
        subject,
        html,
      });

      if (error) {
        console.error(`[Email] Resend error (${logContext}):`, error);
        return { ok: false, error: error.message };
      }
      console.log(`[Email] ${logContext} sent successfully via Resend to ${to}`);
      return { ok: true };
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      console.error(`[Email] Resend exception (${logContext}):`, err);
      return { ok: false, error: errorMsg };
    }
  }

  return { ok: false, error: "Aucun service d'email configuré" };
}

export async function sendVerificationEmail(
  to: string,
  displayName: string,
  code: string
): Promise<SendResult> {
  if (!process.env.SMTP_USER && !process.env.RESEND_API_KEY) {
    // Développement sans SMTP : le code s'affiche dans la console du serveur
    if (process.env.NODE_ENV !== "production") console.log(`\n[DEV] Code de vérification pour ${to} : ${code}\n`);
    return { ok: true };
  }

  return sendMail(
    to,
    `${code} — ton code de vérification AfroMix`,
    verifyEmailHtml(displayName, code),
    "Verification email"
  );
}

export async function sendPasswordResetEmail(
  to: string,
  displayName: string,
  token: string
): Promise<SendResult> {
  const resetUrl = `${APP_URL}/reset-password?token=${token}`;

  if (!process.env.SMTP_USER && !process.env.RESEND_API_KEY) {
    console.log(`\n[DEV] Password reset URL for ${to}:\n${resetUrl}\n`);
    return { ok: true };
  }

  return sendMail(
    to,
    "Réinitialise ton mot de passe — AfroMix",
    resetPasswordHtml(displayName, resetUrl),
    "Password reset email"
  );
}

function eventRejectionHtml(displayName: string, eventTitle: string, reason: string): string {
  return `
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:Inter,Helvetica,Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:40px 20px">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#111;border-radius:12px;overflow:hidden;border:1px solid #222">
        <tr><td style="background:linear-gradient(135deg,#DC2626,#9333EA);padding:32px;text-align:center">
          <img src="${APP_URL}/brand/afromix-logo-white.png" alt="AfroMix" width="150" height="48" style="display:block;margin:0 auto 16px;border:0;outline:none;height:48px;width:150px">
          <h1 style="margin:0;color:#fff;font-size:26px;font-weight:700">Modération Événement</h1>
          <p style="margin:8px 0 0;color:rgba(255,255,255,0.85);font-size:14px">Mise à jour concernant votre publication</p>
        </td></tr>
        <tr><td style="padding:40px 32px">
          <h2 style="margin:0 0 16px;color:#fff;font-size:19px">Bonjour ${esc(displayName)},</h2>
          <p style="margin:0 0 16px;color:#a1a1aa;font-size:15px;line-height:1.6">
            Votre événement <strong style="color:#fff">« ${esc(eventTitle)} »</strong> n'a pas été validé par notre équipe de modération.
          </p>
          <div style="background:#1a1114;border:1px solid #7f1d1d;border-radius:8px;padding:16px 20px;margin:20px 0">
            <p style="margin:0 0 6px;color:#f87171;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px">Motif du refus :</p>
            <p style="margin:0;color:#fca5a5;font-size:14px;line-height:1.5">${esc(reason)}</p>
          </div>
          <p style="margin:20px 0 0;color:#a1a1aa;font-size:14px;line-height:1.6">
            Vous pouvez ajuster les informations de votre événement et soumettre à nouveau une demande conforme à nos critères.
          </p>
        </td></tr>
        <tr><td style="border-top:1px solid #222;padding:24px 32px;text-align:center">
          <p style="margin:0;color:#52525b;font-size:12px">AfroMix — L'équipe de modération</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function eventApprovalHtml(displayName: string, eventTitle: string): string {
  return `
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:Inter,Helvetica,Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:40px 20px">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#111;border-radius:12px;overflow:hidden;border:1px solid #222">
        <tr><td style="background:linear-gradient(135deg,#10B981,#6366F1);padding:32px;text-align:center">
          <img src="${APP_URL}/brand/afromix-logo-white.png" alt="AfroMix" width="150" height="48" style="display:block;margin:0 auto 16px;border:0;outline:none;height:48px;width:150px">
          <h1 style="margin:0;color:#fff;font-size:26px;font-weight:700">Événement validé</h1>
          <p style="margin:8px 0 0;color:rgba(255,255,255,0.85);font-size:14px">Votre date est maintenant en ligne !</p>
        </td></tr>
        <tr><td style="padding:40px 32px">
          <h2 style="margin:0 0 16px;color:#fff;font-size:19px">Félicitations ${esc(displayName)},</h2>
          <p style="margin:0 0 20px;color:#a1a1aa;font-size:15px;line-height:1.6">
            Votre événement <strong style="color:#fff">« ${esc(eventTitle)} »</strong> a été approuvé avec succès par l'équipe AfroMix. Il est dès à présent visible pour l'ensemble des auditeurs sur la plateforme.
          </p>
          <table cellpadding="0" cellspacing="0" width="100%"><tr><td align="center" style="padding:8px 0 24px">
            <a href="${APP_URL}/events" style="display:inline-block;background:linear-gradient(135deg,#9333EA,#DB2777);color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-size:14px;font-weight:600">
              Voir sur AfroMix
            </a>
          </td></tr></table>
        </td></tr>
        <tr><td style="border-top:1px solid #222;padding:24px 32px;text-align:center">
          <p style="margin:0;color:#52525b;font-size:12px">AfroMix — L'équipe de modération</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export async function sendEventRejectionEmail(
  to: string,
  displayName: string,
  eventTitle: string,
  reason: string
): Promise<SendResult> {
  if (!process.env.SMTP_USER && !process.env.RESEND_API_KEY) {
    console.log(`\n[DEV] Event Rejection Email for ${to}:\nEvent: ${eventTitle}\nReason: ${reason}\n`);
    return { ok: true };
  }

  return sendMail(
    to,
    `Mise à jour sur votre événement « ${eventTitle} » — AfroMix`,
    eventRejectionHtml(displayName, eventTitle, reason),
    "Event rejection email"
  );
}

export async function sendEventApprovalEmail(
  to: string,
  displayName: string,
  eventTitle: string
): Promise<SendResult> {
  if (!process.env.SMTP_USER && !process.env.RESEND_API_KEY) {
    console.log(`\n[DEV] Event Approval Email for ${to}:\nEvent: ${eventTitle}\n`);
    return { ok: true };
  }

  return sendMail(
    to,
    `Votre événement « ${eventTitle} » est validé — AfroMix`,
    eventApprovalHtml(displayName, eventTitle),
    "Event approval email"
  );
}

// ─── Email Demande de Booking / Contact DJ ────────────────────────────────────

function bookingInquiryHtml(
  artistName: string,
  inquiry: {
    senderName: string;
    senderEmail: string;
    senderPhone?: string | null;
    eventType: string;
    eventDate?: string | null;
    eventCity?: string | null;
    budget?: string | null;
    message: string;
  }
): string {
  const eventTypeLabels: Record<string, string> = {
    CLUB: "Soirée Club / Discothèque",
    FESTIVAL: "Festival / Concert grand public",
    WEDDING: "Mariage / Cérémonie",
    PRIVATE: "Événement privé / Anniversaire",
    CONCERT: "Concert Live / Première partie",
    OTHER: "Autre prestation",
  };

  const typeLabel = eventTypeLabels[inquiry.eventType] || inquiry.eventType;

  return `
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:Inter,Helvetica,Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:40px 20px">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#111;border-radius:12px;overflow:hidden;border:1px solid #222">
        <tr><td style="background:linear-gradient(135deg,#9333EA,#DB2777);padding:32px;text-align:center">
          <img src="${APP_URL}/brand/afromix-logo-white.png" alt="AfroMix" width="150" height="48" style="display:block;margin:0 auto 16px;border:0;outline:none;height:48px;width:150px">
          <h1 style="margin:0;color:#fff;font-size:24px;font-weight:700">Nouvelle demande de contact / Booking</h1>
          <p style="margin:8px 0 0;color:rgba(255,255,255,0.85);font-size:14px">Pour ${esc(artistName)} via AfroMix</p>
        </td></tr>
        <tr><td style="padding:32px">
          <p style="margin:0 0 20px;color:#e4e4e7;font-size:15px;line-height:1.5">
            Bonjour <strong>${esc(artistName)}</strong>, vous venez de recevoir une nouvelle proposition de prestation sur votre profil AfroMix.
          </p>

          <div style="background:#18181b;border:1px solid #27272a;border-radius:8px;padding:20px;margin-bottom:24px">
            <h3 style="margin:0 0 14px;color:#a855f7;font-size:14px;text-transform:uppercase;letter-spacing:1px">Coordonnées de l'organisateur</h3>
            <p style="margin:0 0 8px;color:#d4d4d8;font-size:14px"><strong>Nom :</strong> ${esc(inquiry.senderName)}</p>
            <p style="margin:0 0 8px;color:#d4d4d8;font-size:14px"><strong>Email :</strong> <a href="mailto:${esc(inquiry.senderEmail)}" style="color:#a855f7">${esc(inquiry.senderEmail)}</a></p>
            ${inquiry.senderPhone ? `<p style="margin:0 0 8px;color:#d4d4d8;font-size:14px"><strong>Téléphone / WhatsApp :</strong> <a href="tel:${esc(inquiry.senderPhone)}" style="color:#a855f7">${esc(inquiry.senderPhone)}</a></p>` : ""}
            <p style="margin:0 0 8px;color:#d4d4d8;font-size:14px"><strong>Type d'événement :</strong> ${esc(typeLabel)}</p>
            ${inquiry.eventDate ? `<p style="margin:0 0 8px;color:#d4d4d8;font-size:14px"><strong>Date souhaitée :</strong> ${esc(inquiry.eventDate)}</p>` : ""}
            ${inquiry.eventCity ? `<p style="margin:0 0 8px;color:#d4d4d8;font-size:14px"><strong>Lieu / Ville :</strong> ${esc(inquiry.eventCity)}</p>` : ""}
            ${inquiry.budget ? `<p style="margin:0;color:#d4d4d8;font-size:14px"><strong>Budget indicatif :</strong> ${esc(inquiry.budget)}</p>` : ""}
          </div>

          <div style="background:#18181b;border:1px solid #27272a;border-radius:8px;padding:20px;margin-bottom:24px">
            <h3 style="margin:0 0 10px;color:#a855f7;font-size:14px;text-transform:uppercase;letter-spacing:1px">Message de l'organisateur</h3>
            <p style="margin:0;color:#f4f4f5;font-size:14px;line-height:1.6;white-space:pre-wrap">${esc(inquiry.message)}</p>
          </div>

          <table cellpadding="0" cellspacing="0" width="100%"><tr><td align="center">
            <a href="mailto:${esc(inquiry.senderEmail)}?subject=Re:%20Votre%20demande%20de%20booking%20AfroMix" style="display:inline-block;background:linear-gradient(135deg,#9333EA,#DB2777);color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-size:14px;font-weight:600">
              Répondre directement par Email
            </a>
          </td></tr></table>
        </td></tr>
        <tr><td style="border-top:1px solid #222;padding:20px 32px;text-align:center">
          <p style="margin:0;color:#52525b;font-size:12px">AfroMix Booking & Relations Artistes</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export async function sendBookingInquiryEmail(
  to: string,
  artistName: string,
  inquiry: {
    senderName: string;
    senderEmail: string;
    senderPhone?: string | null;
    eventType: string;
    eventDate?: string | null;
    eventCity?: string | null;
    budget?: string | null;
    message: string;
  }
): Promise<SendResult> {
  if (!process.env.SMTP_USER && !process.env.RESEND_API_KEY) {
    console.log(`\n[DEV] Booking Inquiry Email for ${to} (${artistName}):\nFrom: ${inquiry.senderName} <${inquiry.senderEmail}>\nType: ${inquiry.eventType}\nMessage: ${inquiry.message}\n`);
    return { ok: true };
  }

  return sendMail(
    to,
    `Nouvelle demande de booking de ${inquiry.senderName} — AfroMix`,
    bookingInquiryHtml(artistName, inquiry),
    "Booking inquiry email"
  );
}

