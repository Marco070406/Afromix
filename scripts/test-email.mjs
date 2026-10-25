import nodemailer from "nodemailer";
import { Resend } from "resend";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const smtpUser = process.env.SMTP_USER;
const smtpPass = process.env.SMTP_PASS;
const resendKey = process.env.RESEND_API_KEY;
const from = process.env.EMAIL_FROM || (smtpUser ? `AfroMix <${smtpUser}>` : "AfroMix <onboarding@resend.dev>");
const to = process.argv[2] || smtpUser;

console.log("--------------------------------------------------");
console.log("  🎵 AfroMix - Test d'envoi d'email réel");
console.log("--------------------------------------------------");

if (!smtpUser && !resendKey) {
  console.error("❌ ERREUR: Aucun service d'email configuré dans .env.local (SMTP_USER ou RESEND_API_KEY).");
  process.exit(1);
}

if (!to) {
  console.error("❌ Erreur: Aucune adresse destinataire fournie.");
  console.log("Usage: node scripts/test-email.mjs votre-email@example.com");
  process.exit(1);
}

console.log(`➡️  Service    : ${smtpUser ? "Gmail SMTP" : "Resend"}`);
console.log(`➡️  Expéditeur : ${from}`);
console.log(`➡️  Destinataire : ${to}`);
console.log(`➡️  Envoi en cours...`);

if (smtpUser && smtpPass) {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: Number(process.env.SMTP_PORT || 465),
    secure: process.env.SMTP_SECURE === "false" ? false : true,
    auth: {
      user: smtpUser,
      pass: smtpPass.replace(/\s+/g, ""),
    },
  });

  try {
    const info = await transporter.sendMail({
      from,
      to,
      subject: "Test d'activation AfroMix — Gmail SMTP 🎵",
      html: `
        <div style="font-family: sans-serif; background: #0a0a0a; color: #fff; padding: 32px; border-radius: 12px; max-width: 500px;">
          <h2 style="color: #c084fc; margin-top: 0;">🎵 AfroMix — Email de confirmation</h2>
          <p style="color: #e4e4e7; font-size: 15px;">Félicitations ! Votre configuration Gmail SMTP fonctionne parfaitement.</p>
          <p style="color: #a1a1aa; font-size: 13px;">Les emails de vérification de compte AfroMix seront désormais envoyés en réel depuis <strong>${smtpUser}</strong>.</p>
        </div>
      `,
    });
    console.log("\n✅ Succès ! Email envoyé avec succès via Gmail.");
    console.log("Message ID :", info.messageId);
    process.exit(0);
  } catch (err) {
    console.error("\n❌ Échec de l'envoi SMTP :");
    console.error(err);
    process.exit(1);
  }
} else if (resendKey) {
  const resend = new Resend(resendKey);
  try {
    const { data, error } = await resend.emails.send({
      from,
      to,
      subject: "Test d'activation AfroMix — Resend 🎵",
      html: `<p>Félicitations ! L'envoi via Resend est opérationnel.</p>`,
    });
    if (error) {
      console.error("\n❌ Erreur Resend :", error);
      process.exit(1);
    }
    console.log("\n✅ Succès ! Email envoyé avec succès via Resend. ID :", data?.id);
    process.exit(0);
  } catch (err) {
    console.error("\n❌ Exception Resend :", err);
    process.exit(1);
  }
}
