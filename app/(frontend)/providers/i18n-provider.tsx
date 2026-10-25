"use client";

import React, { createContext, useCallback, useContext, useEffect } from "react";
import { useStoredValue } from "@/app/(frontend)/hooks/use-stored-value";

export type Language = "fr" | "en";

/** Signature de tr(), pour les fonctions hors composant qui le reçoivent en paramètre */
export type Translate = (fr: string, en: string) => string;

export const translations = {
  fr: {
    // Navigation
    "nav.home": "Accueil",
    "nav.explore": "Explorer",
    "nav.trending": "Tendances",
    "nav.djs": "DJs",
    "nav.playlists": "Playlists",
    "nav.events": "Événements",
    "nav.library": "Bibliothèque",
    "nav.discover": "Découverte",
    "nav.myMusic": "Ma Musique",
    "nav.studio": "Studio",
    "nav.upload": "Ajouter",
    "nav.analytics": "Analytics",
    "nav.admin": "Administration",
    "nav.adminRole": "Administrateur",
    "nav.settings": "Paramètres",
    "nav.creator": "Créateur",
    "nav.listener": "Auditeur",
    "nav.artist": "DJ / Artiste",
    "nav.profile": "Profil",
    "nav.djProfile": "Mon profil DJ",
    "nav.notifications": "Notifications",
    "nav.collapseMenu": "Réduire le menu",
    "nav.expandMenu": "Agrandir le menu",

    // Header & Actions
    "search.placeholder": "Chercher mixes, DJs, genres...",
    "search.searching": "Recherche en cours...",
    "search.noResults": "Aucun résultat pour",
    "search.exploreDeep": "Explorer la recherche approfondie",
    "search.mixes": "Mixes",
    "search.artists": "DJs & Artistes",
    "search.viewAll": "Voir tous les résultats",
    "btn.listenNow": "Écouter maintenant",
    "btn.viewProfile": "Voir le profil",
    "btn.follow": "Suivre",
    "btn.following": "Suivi",
    "btn.share": "Partager",
    "btn.login": "Connexion",
    "btn.register": "S'inscrire",
    "btn.logout": "Déconnexion",
    "btn.viewAll": "Tout voir",
    "btn.tickets": "Billetterie",
    "btn.retry": "Réessayer",
    "btn.save": "Enregistrer les modifications",
    "btn.cancel": "Annuler",
    "btn.next": "Étape suivante",
    "btn.previous": "Étape précédente",
    "btn.publish": "Publier maintenant",
    "btn.skip": "Passer cette étape",

    // Hero & Sections
    "hero.subtitle": "vous emmène au cœur des rythmes afro contemporains. Écoutez le mix tendance de la semaine en haute qualité.",
    "hero.error": "Impossible de charger les tendances",
    "section.trending": "Tendances en Afrique",
    "section.popularDjs": "DJs populaires",
    "section.newMixes": "Nouveaux mixes",
    "section.countries": "Découvrir par pays",
    "section.genres": "Explorer par genre",
    "badge.newMix": "Nouveau mix",

    // Player
    "player.nowPlaying": "En cours de lecture",
    "player.queue": "File d'attente",
    "player.emptyQueue": "Aucun titre suivant",
    "player.hq": "HQ",
    "player.share": "Partager ce mix",
    "player.fullscreen": "Plein écran",
    "player.copied": "Lien du mix copié !",
    "player.loginToLike": "Connectez-vous pour aimer ce mix",
    "player.loginToFollow": "Connectez-vous pour suivre",
    "player.unavailable": "Ce mix n'est pas encore disponible",

    // Filters
    "filter.all": "Tout",
    "filter.mixes": "Mixes",
    "filter.tracks": "Titres",
    "filter.artists": "DJs",
    "filter.albums": "Albums",
    "filter.filters": "Filtres",
    "filter.noResults": "Aucun résultat trouvé",
    "filter.genre": "Genre",
    "filter.subGenres": "Sous-genres",
    "filter.city": "Ville",
    "filter.reset": "Réinitialiser",
    "filter.activeFilters": "Filtres actifs:",
    "filter.moreCities": "villes",
    "filter.showLess": "Réduire",

    // Countries
    "country.TG": "Togo",
    "country.GH": "Ghana",
    "country.NG": "Nigeria",
    "country.CI": "Côte d'Ivoire",
    "country.SN": "Sénégal",
    "country.CM": "Cameroun",
    "country.ZA": "Afrique du Sud",
    "country.KE": "Kenya",

    // Upload
    "upload.title": "Publier un mix",
    "upload.subtitle": "Partagez votre création avec la communauté AfroMix",
    "upload.stepMeta": "Métadonnées",
    "upload.stepAudio": "Audio",
    "upload.stepCover": "Cover",
    "upload.stepPublish": "Publication",
    "upload.mixTitle": "Titre du mix *",
    "upload.mixTitlePlaceholder": "AfroMix Session Vol.1",
    "upload.description": "Description",
    "upload.descriptionPlaceholder": "Décrivez votre mix...",
    "upload.genre": "Genre *",
    "upload.type": "Type *",
    "upload.tags": "Tags (séparés par des virgules)",
    "upload.tagsPlaceholder": "afrobeats, naija, 2026",
    "upload.titleRequired": "Titre requis (min 2 caractères)",
    "upload.genreRequired": "Genre requis",
    "upload.typeRequired": "Type requis",
    "upload.mixCreated": "Mix créé ! Importez maintenant l'audio.",
    "upload.mixCreateError": "Impossible de créer le mix",
    "upload.dropAudio": "Déposez votre fichier audio",
    "upload.audioFormats": "MP3, WAV, FLAC, OGG — max 500 MB",
    "upload.chooseFile": "Choisir un fichier",
    "upload.audioUploaded": "Audio uploadé avec succès !",
    "upload.audioProcessing": "En cours de traitement...",
    "upload.audioProgress": "uploadé...",
    "upload.audioError": "Erreur lors de l'upload audio",
    "upload.coverTitle": "Cover du mix",
    "upload.coverFormats": "JPEG, PNG, WEBP — recommandé 3000×3000px",
    "upload.chooseImage": "Choisir une image",
    "upload.saveCover": "Enregistrer la pochette",
    "upload.coverUploaded": "Cover uploadée !",
    "upload.coverError": "Erreur lors de l'upload de la cover",
    "upload.readyTitle": "Prêt à publier !",
    "upload.readyDesc": "Votre mix sera visible par tous les utilisateurs d'AfroMix.",
    "upload.published": "Mix publié !",
    "upload.publishError": "Impossible de publier le mix",
    "upload.editInfo": "Modifier les informations",
    "upload.creatorsOnly": "Espace réservé aux Créateurs",
    "upload.creatorsOnlyDesc": "L'upload de mixes est accessible aux comptes DJ & Artistes. En tant qu'auditeur, vous pouvez explorer, écouter et créer vos playlists.",
    "upload.myPlaylists": "Mes Playlists",
    "upload.exploreMixes": "Explorer les mixes",

    // Analytics
    "analytics.title": "Analytics",
    "analytics.subtitle": "Comprenez votre audience en profondeur",
    "analytics.unavailable": "Analytics indisponibles",
    "analytics.geography": "Géographie",
    "analytics.peakHours": "Heures de pointe",
    "analytics.topContent": "Top contenu",
    "analytics.uniqueListeners": "Auditeurs uniques",
    "analytics.avgListenTime": "Durée moy. d'écoute",
    "analytics.countries": "Pays d'écoute",
    "analytics.peakHour": "Heure de pointe",
    "analytics.byCountry": "Audience par pays",
    "analytics.topCities": "Top villes",
    "analytics.noCityData": "Aucune donnée de ville",
    "analytics.noData": "Aucune donnée disponible",
    "analytics.listeningHours": "Heures d'écoute (UTC)",
    "analytics.activityByHour": "Intensité par tranche horaire",
    "analytics.plays": "Écoutes",
    "analytics.comments": "Commentaires",
    "analytics.noDataYet": "Pas encore de données.",

    // Dashboard
    "dashboard.title": "Dashboard",
    "dashboard.subtitle": "Vos statistiques de création",
    "dashboard.totalPlays": "Écoutes totales",
    "dashboard.likes": "Likes",
    "dashboard.followers": "Followers",
    "dashboard.published": "Mixes publiés",
    "dashboard.playsEvolution": "Évolution des écoutes",
    "dashboard.topMixes": "Top mixes",
    "dashboard.noDataPeriod": "Pas encore de données pour cette période.",
    "dashboard.loadError": "Impossible de charger les analytics",

    // Settings
    "settings.title": "Paramètres",
    "settings.subtitle": "Gérez vos préférences de streaming, langue et notifications sur AfroMix.",
    "settings.language": "Langue de l'interface",
    "settings.languageDesc": "Choisissez votre langue d'affichage préférée.",
    "settings.langDefault": "Par défaut",
    "settings.langInternational": "International",
    "settings.langSwitchedFr": "Langue basculée en Français",
    "settings.langSwitchedEn": "Language switched to English",
    "settings.audioQuality": "Qualité de lecture audio",
    "settings.audioQualityDesc": "Optimisez pour la fidélité sonore ou l'économie de données.",
    "settings.audioHQ": "Haute Fidélité (HQ)",
    "settings.audioHQDesc": "320 kbps • Son studio pur",
    "settings.audioStandard": "Standard",
    "settings.audioStandardDesc": "192 kbps • Équilibré",
    "settings.audioEco": "Éco Données",
    "settings.audioEcoDesc": "128 kbps • Faible consommation",
    "settings.recommended": "Recommandé",
    "settings.notifications": "Notifications",
    "settings.notificationsDesc": "Choisissez ce dont vous voulez être alerté.",
    "settings.notifyMixes": "Nouveaux mixes de vos DJs suivis",
    "settings.notifyEvents": "Concerts et événements dans votre pays",
    "settings.notifyComments": "Réponses à vos commentaires et mentions",
    "settings.saved": "Préférences enregistrées avec succès",

    // Common
    "common.tracks": "titres",
    "common.mixes": "mixes",
    "common.followers": "abonnés",
    "common.plays": "écoutes",
    "common.other": "Autre",
    "common.language": "Langue",
  },
  en: {
    // Navigation
    "nav.home": "Home",
    "nav.explore": "Explore",
    "nav.trending": "Trending",
    "nav.djs": "DJs",
    "nav.playlists": "Playlists",
    "nav.events": "Events",
    "nav.library": "Library",
    "nav.discover": "Discover",
    "nav.myMusic": "My Music",
    "nav.studio": "Studio",
    "nav.upload": "Upload",
    "nav.analytics": "Analytics",
    "nav.admin": "Admin",
    "nav.adminRole": "Administrator",
    "nav.settings": "Settings",
    "nav.creator": "Creator",
    "nav.listener": "Listener",
    "nav.artist": "DJ / Artist",
    "nav.profile": "Profile",
    "nav.djProfile": "My DJ Profile",
    "nav.notifications": "Notifications",
    "nav.collapseMenu": "Collapse sidebar",
    "nav.expandMenu": "Expand sidebar",

    // Header & Actions
    "search.placeholder": "Search mixes, DJs, genres...",
    "search.searching": "Searching...",
    "search.noResults": "No results for",
    "search.exploreDeep": "Explore detailed search",
    "search.mixes": "Mixes",
    "search.artists": "DJs & Artists",
    "search.viewAll": "View all results",
    "btn.listenNow": "Listen Now",
    "btn.viewProfile": "View Profile",
    "btn.follow": "Follow",
    "btn.following": "Following",
    "btn.share": "Share",
    "btn.login": "Log in",
    "btn.register": "Sign up",
    "btn.logout": "Log out",
    "btn.viewAll": "View all",
    "btn.tickets": "Get Tickets",
    "btn.retry": "Retry",
    "btn.save": "Save changes",
    "btn.cancel": "Cancel",
    "btn.next": "Next step",
    "btn.previous": "Previous step",
    "btn.publish": "Publish now",
    "btn.skip": "Skip this step",

    // Hero & Sections
    "hero.subtitle": "takes you to the heart of contemporary African rhythms. Stream this week's trending mix in high quality.",
    "hero.error": "Unable to load trending mixes",
    "section.trending": "Trending in Africa",
    "section.popularDjs": "Popular DJs",
    "section.newMixes": "New Releases",
    "section.countries": "Discover by Country",
    "section.genres": "Explore by Genre",
    "badge.newMix": "New Mix",

    // Player
    "player.nowPlaying": "Now Playing",
    "player.queue": "Queue",
    "player.emptyQueue": "No upcoming tracks",
    "player.hq": "HQ",
    "player.share": "Share this mix",
    "player.fullscreen": "Fullscreen",
    "player.copied": "Mix link copied!",
    "player.loginToLike": "Log in to like this mix",
    "player.loginToFollow": "Log in to follow",
    "player.unavailable": "This mix is not yet available",

    // Filters
    "filter.all": "All",
    "filter.mixes": "Mixes",
    "filter.tracks": "Tracks",
    "filter.artists": "DJs",
    "filter.albums": "Albums",
    "filter.filters": "Filters",
    "filter.noResults": "No results found",
    "filter.genre": "Genre",
    "filter.subGenres": "Sub-genres",
    "filter.city": "City",
    "filter.reset": "Reset",
    "filter.activeFilters": "Active filters:",
    "filter.moreCities": "cities",
    "filter.showLess": "Show less",

    // Countries
    "country.TG": "Togo",
    "country.GH": "Ghana",
    "country.NG": "Nigeria",
    "country.CI": "Ivory Coast",
    "country.SN": "Senegal",
    "country.CM": "Cameroon",
    "country.ZA": "South Africa",
    "country.KE": "Kenya",

    // Upload
    "upload.title": "Publish a mix",
    "upload.subtitle": "Share your creation with the AfroMix community",
    "upload.stepMeta": "Metadata",
    "upload.stepAudio": "Audio",
    "upload.stepCover": "Cover",
    "upload.stepPublish": "Publish",
    "upload.mixTitle": "Mix title *",
    "upload.mixTitlePlaceholder": "AfroMix Session Vol.1",
    "upload.description": "Description",
    "upload.descriptionPlaceholder": "Describe your mix...",
    "upload.genre": "Genre *",
    "upload.type": "Type *",
    "upload.tags": "Tags (comma-separated)",
    "upload.tagsPlaceholder": "afrobeats, naija, 2026",
    "upload.titleRequired": "Title required (min 2 characters)",
    "upload.genreRequired": "Genre required",
    "upload.typeRequired": "Type required",
    "upload.mixCreated": "Mix created! Now upload the audio.",
    "upload.mixCreateError": "Unable to create the mix",
    "upload.dropAudio": "Drop your audio file here",
    "upload.audioFormats": "MP3, WAV, FLAC, OGG — max 500 MB",
    "upload.chooseFile": "Choose a file",
    "upload.audioUploaded": "Audio uploaded successfully!",
    "upload.audioProcessing": "Processing...",
    "upload.audioProgress": "uploaded...",
    "upload.audioError": "Error uploading audio",
    "upload.coverTitle": "Mix cover art",
    "upload.coverFormats": "JPEG, PNG, WEBP — recommended 3000×3000px",
    "upload.chooseImage": "Choose an image",
    "upload.saveCover": "Save cover art",
    "upload.coverUploaded": "Cover uploaded!",
    "upload.coverError": "Error uploading cover",
    "upload.readyTitle": "Ready to publish!",
    "upload.readyDesc": "Your mix will be visible to all AfroMix users.",
    "upload.published": "Mix published!",
    "upload.publishError": "Unable to publish the mix",
    "upload.editInfo": "Edit information",
    "upload.creatorsOnly": "Creators Only",
    "upload.creatorsOnlyDesc": "Uploading mixes is available to DJ & Artist accounts. As a listener, you can explore, listen, and create playlists.",
    "upload.myPlaylists": "My Playlists",
    "upload.exploreMixes": "Explore mixes",

    // Analytics
    "analytics.title": "Analytics",
    "analytics.subtitle": "Understand your audience in depth",
    "analytics.unavailable": "Analytics unavailable",
    "analytics.geography": "Geography",
    "analytics.peakHours": "Peak Hours",
    "analytics.topContent": "Top Content",
    "analytics.uniqueListeners": "Unique listeners",
    "analytics.avgListenTime": "Avg. listen time",
    "analytics.countries": "Countries",
    "analytics.peakHour": "Peak hour",
    "analytics.byCountry": "Audience by country",
    "analytics.topCities": "Top cities",
    "analytics.noCityData": "No city data yet",
    "analytics.noData": "No data available",
    "analytics.listeningHours": "Listening hours (UTC)",
    "analytics.activityByHour": "Activity by hour slot",
    "analytics.plays": "Plays",
    "analytics.comments": "Comments",
    "analytics.noDataYet": "No data yet.",

    // Dashboard
    "dashboard.title": "Dashboard",
    "dashboard.subtitle": "Your creation statistics",
    "dashboard.totalPlays": "Total plays",
    "dashboard.likes": "Likes",
    "dashboard.followers": "Followers",
    "dashboard.published": "Published mixes",
    "dashboard.playsEvolution": "Plays over time",
    "dashboard.topMixes": "Top mixes",
    "dashboard.noDataPeriod": "No data for this period yet.",
    "dashboard.loadError": "Unable to load analytics",

    // Settings
    "settings.title": "Settings",
    "settings.subtitle": "Manage your streaming, language, and notification preferences on AfroMix.",
    "settings.language": "Interface Language",
    "settings.languageDesc": "Select your preferred display language.",
    "settings.langDefault": "Default",
    "settings.langInternational": "International",
    "settings.langSwitchedFr": "Langue basculée en Français",
    "settings.langSwitchedEn": "Language switched to English",
    "settings.audioQuality": "Audio Streaming Quality",
    "settings.audioQualityDesc": "Optimize for high fidelity or mobile data savings.",
    "settings.audioHQ": "High Fidelity (HQ)",
    "settings.audioHQDesc": "320 kbps • Pure studio sound",
    "settings.audioStandard": "Standard",
    "settings.audioStandardDesc": "192 kbps • Balanced",
    "settings.audioEco": "Data Saver",
    "settings.audioEcoDesc": "128 kbps • Low data usage",
    "settings.recommended": "Recommended",
    "settings.notifications": "Notifications",
    "settings.notificationsDesc": "Choose what updates you want to receive.",
    "settings.notifyMixes": "New mixes from followed DJs",
    "settings.notifyEvents": "Concerts & events in your area",
    "settings.notifyComments": "Replies to your comments & mentions",
    "settings.saved": "Preferences saved successfully",

    // Common
    "common.tracks": "tracks",
    "common.mixes": "mixes",
    "common.followers": "followers",
    "common.plays": "plays",
    "common.other": "Other",
    "common.language": "Language",
  },
} as const;

export type TranslationKey = keyof typeof translations.fr;

interface I18nContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
  t: (key: TranslationKey, fallback?: string) => string;
  /** Texte ponctuel sans clé de dictionnaire : tr("Bonjour", "Hello") */
  tr: (fr: string, en: string) => string;
}

const I18nContext = createContext<I18nContextType | null>(null);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [storedLang, setStoredLang] = useStoredValue("afromix_lang", "fr");
  const language: Language = storedLang === "en" ? "en" : "fr";

  const setLanguage = (lang: Language) => setStoredLang(lang);

  // <html lang> suit la langue choisie (lecteurs d'écran, traduction du navigateur)
  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const toggleLanguage = () => {
    const next = language === "fr" ? "en" : "fr";
    setLanguage(next);
  };

  const t = (key: TranslationKey, fallback?: string): string => {
    return translations[language][key] ?? fallback ?? key;
  };

  // Stable tant que la langue ne change pas : utilisable dans les dépendances des hooks
  const tr = useCallback((fr: string, en: string): string => (language === "fr" ? fr : en), [language]);

  return (
    <I18nContext.Provider value={{ language, setLanguage, toggleLanguage, t, tr }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error("useI18n must be used within an I18nProvider");
  }
  return context;
}
