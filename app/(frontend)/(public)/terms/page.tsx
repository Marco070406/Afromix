"use client";

import { useI18n } from "@/app/(frontend)/providers/i18n-provider";

export default function TermsPage() {
  const { tr } = useI18n();

  const sections = [
    {
      title: tr("Le service", "The service"),
      text: tr(
        "AfroMix permet d'écouter des mixes de DJs, de découvrir des artistes et des événements, et de contacter des DJs pour des prestations.",
        "AfroMix lets you listen to DJ mixes, discover artists and events, and contact DJs for bookings."
      ),
    },
    {
      title: tr("Votre compte", "Your account"),
      text: tr(
        "Vous êtes responsable de votre compte et de la confidentialité de votre mot de passe. Les informations fournies doivent être exactes.",
        "You are responsible for your account and for keeping your password confidential. The information you provide must be accurate."
      ),
    },
    {
      title: tr("Contenus publiés", "Published content"),
      text: tr(
        "En publiant un mix, une image ou un événement, vous confirmez détenir les droits nécessaires. Les contenus restent les vôtres ; vous autorisez AfroMix à les héberger et à les diffuser sur la plateforme.",
        "By publishing a mix, an image or an event, you confirm that you hold the necessary rights. Your content remains yours; you allow AfroMix to host and stream it on the platform."
      ),
    },
    {
      title: tr("Règles de conduite", "Code of conduct"),
      text: tr(
        "Les contenus illégaux, haineux ou portant atteinte aux droits d'autrui sont interdits. AfroMix peut les retirer et suspendre les comptes concernés.",
        "Illegal or hateful content, and content that infringes the rights of others, is prohibited. AfroMix may remove it and suspend the accounts involved."
      ),
    },
    {
      title: tr("Réservations", "Bookings"),
      text: tr(
        "AfroMix met en relation les organisateurs et les DJs. Les accords, tarifs et paiements se décident directement entre eux.",
        "AfroMix connects organisers and DJs. Agreements, rates and payments are settled directly between them."
      ),
    },
    {
      title: tr("Données personnelles", "Personal data"),
      text: tr(
        "Nous utilisons votre adresse e-mail, votre profil et vos écoutes pour faire fonctionner le service et personnaliser vos recommandations. Vous pouvez demander leur modification ou leur suppression.",
        "We use your email address, profile and listening activity to run the service and personalise your recommendations. You may ask for them to be changed or deleted."
      ),
    },
  ];

  return (
    <div className="max-w-3xl mx-auto px-4 py-10 space-y-8">
      <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
        {tr("Conditions générales", "Terms of service")}
      </h1>
      {sections.map((section) => (
        <section key={section.title} className="space-y-2">
          <h2 className="text-lg font-bold text-white">{section.title}</h2>
          <p className="text-sm sm:text-base text-zinc-300 leading-relaxed">{section.text}</p>
        </section>
      ))}
    </div>
  );
}
