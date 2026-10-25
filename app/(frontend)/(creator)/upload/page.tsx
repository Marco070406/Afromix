"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Upload,
  Music2,
  Image as ImageIcon,
  Check,
  ArrowRight,
  ArrowLeft,
  ListMusic,
  Sparkles,
  Palette,
  Clock,
  Plus,
  FileAudio,
  Radio,
  Disc3,
  Loader2,
  Headphones,
  Lightbulb,
  Timer,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/app/(frontend)/providers/auth-provider";
import { useI18n } from "@/app/(frontend)/providers/i18n-provider";
import { mixesApi } from "@/app/(frontend)/lib/api/mixes";
import { RequireAuth } from "@/app/(frontend)/components/auth/require-auth";
import { Button } from "@/app/(frontend)/components/ui/button";
import { Input } from "@/app/(frontend)/components/ui/input";
import { Select } from "@/app/(frontend)/components/ui/select";
import { GENRE_LABELS, genreLabel, MIX_TYPE_LABELS, formatDuration, cn } from "@/app/(frontend)/lib/utils";
import { AfromixSymbol } from "@/app/(frontend)/components/brand/afromix-logo";

// Presets de styles pour le générateur de pochette Canvas
const COVER_PRESETS = [
  {
    id: "sunset",
    name: "Sunset Afrobeats",
    colors: ["#7928CA", "#FF0080", "#FF4D4D", "#FFAA00"],
    accent: "#FFAA00",
    bg: "#100618",
  },
  {
    id: "amapiano",
    name: "Amapiano Gold & Noir",
    colors: ["#090A0F", "#1D160C", "#D4AF37", "#F3E5AB"],
    accent: "#D4AF37",
    bg: "#080705",
  },
  {
    id: "lagos",
    name: "Lagos Neon Nights",
    colors: ["#050814", "#1E1035", "#00F0FF", "#FF007A"],
    accent: "#00F0FF",
    bg: "#060814",
  },
  {
    id: "abidjan",
    name: "Abidjan Lagoon",
    colors: ["#041514", "#0C3836", "#10B981", "#38BDF8"],
    accent: "#10B981",
    bg: "#031412",
  },
  {
    id: "midnight",
    name: "Midnight Pulse",
    colors: ["#0B0D1B", "#2E1065", "#7C3AED", "#C084FC"],
    accent: "#C084FC",
    bg: "#090A14",
  },
];

interface TracklistItemDraft {
  id?: string;
  title: string;
  artistName: string;
  startSec: number;
}

export default function UploadPage() {
  const router = useRouter();
  const { user, isArtist } = useAuth();
  const { language, tr } = useI18n();
  const [step, setStep] = useState(0);

  // Mix created state
  const [mixId, setMixId] = useState<string | null>(null);
  const [mixSlug, setMixSlug] = useState<string | null>(null);
  const [mixTitle, setMixTitle] = useState("");
  const [mixGenre, setMixGenre] = useState("AFROBEATS");

  // Audio state
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioProgress, setAudioProgress] = useState<number>(0);
  const [audioUploading, setAudioUploading] = useState(false);
  const [audioDone, setAudioDone] = useState(false);
  const [detectedDuration, setDetectedDuration] = useState<number | null>(null);

  // Cover state
  const [coverMode, setCoverMode] = useState<"upload" | "generate">("upload");
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreviewUrl, setCoverPreviewUrl] = useState<string | null>(null);
  const [coverUploading, setCoverUploading] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState(COVER_PRESETS[0]);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Tracklist state
  const [tracklist, setTracklist] = useState<TracklistItemDraft[]>([]);
  const [newTrackTitle, setNewTrackTitle] = useState("");
  const [newTrackArtist, setNewTrackArtist] = useState("");
  const [newTrackTimestamp, setNewTrackTimestamp] = useState("00:00");
  const [addingTrack, setAddingTrack] = useState(false);

  // Form schema for step 0
  const metaSchema = z.object({
    title: z
      .string()
      .min(2, language === "fr" ? "Le titre doit comporter au moins 2 caractères" : "Title must be at least 2 chars")
      .max(100),
    description: z.string().max(2000).optional(),
    genre: z.string().min(1),
    mixType: z.string().min(1),
    tags: z.string().optional(),
  });
  type MetaForm = z.infer<typeof metaSchema>;

  const STEPS = [
    language === "fr" ? "Infos & Métadonnées" : "Info & Details",
    language === "fr" ? "Fichier Audio" : "Audio File",
    language === "fr" ? "Pochette Visuelle" : "Cover Artwork",
    language === "fr" ? "Tracklist Ordonnée" : "Tracklist",
    language === "fr" ? "Publication" : "Publish",
  ];

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<MetaForm>({
    resolver: zodResolver(metaSchema),
    defaultValues: { genre: "AFROBEATS", mixType: "DJ_MIX" },
  });

  // Step 0 — Create Mix Draft
  const onMetaSubmit = async (data: MetaForm) => {
    try {
      const tags = data.tags ? data.tags.split(",").map((t) => t.trim()).filter(Boolean) : [];
      const res = await mixesApi.create({
        title: data.title,
        description: data.description,
        genre: data.genre,
        mixType: data.mixType,
        tags,
      });
      setMixId(res.data.id);
      setMixSlug(res.data.slug);
      setMixTitle(data.title);
      setMixGenre(data.genre);
      setStep(1);
      toast.success(language === "fr" ? "Projet de mix initialisé !" : "Mix project created!");
    } catch {
      toast.error(language === "fr" ? "Impossible d'initialiser le mix" : "Failed to create mix");
    }
  };

  // Step 1 — Audio Selection & Metadata Extraction
  const handleAudioSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setAudioFile(file);

    // Extraction de la durée réelle via HTMLAudioElement
    const tempAudio = document.createElement("audio");
    tempAudio.preload = "metadata";
    tempAudio.src = URL.createObjectURL(file);
    tempAudio.onloadedmetadata = () => {
      const dur = Math.round(tempAudio.duration);
      if (dur > 0 && !isNaN(dur)) {
        setDetectedDuration(dur);
      }
      URL.revokeObjectURL(tempAudio.src);
    };
  };

  // Step 1 — Direct Audio Upload (S3/R2 ou local fallback)
  const handleAudioUpload = async () => {
    if (!audioFile || !mixId) return;
    setAudioUploading(true);
    setAudioProgress(0);

    try {
      const presignRes = await mixesApi.presignAudio(mixId, audioFile.type || "audio/mpeg");
      const { uploadUrl, key } = presignRes.data;

      // Upload direct via XMLHttpRequest avec suivi de progression
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            setAudioProgress(Math.round((e.loaded / e.total) * 100));
          }
        };
        xhr.onload = () => (xhr.status < 300 ? resolve() : reject(new Error(`Status ${xhr.status}`)));
        xhr.onerror = () => reject(new Error(tr("Erreur de transfert réseau", "Network transfer error")));
        xhr.open("PUT", uploadUrl);
        xhr.setRequestHeader("Content-Type", audioFile.type || "audio/mpeg");
        xhr.send(audioFile);
      });

      // Confirmation de l'audio avec la durée exacte calculée
      await mixesApi.confirmAudio(mixId, key, detectedDuration ?? undefined);
      setAudioDone(true);
      toast.success(language === "fr" ? "Audio transféré avec succès !" : "Audio uploaded successfully!");
    } catch (err) {
      console.error(err);
      toast.error(language === "fr" ? "Échec du transfert audio" : "Audio upload failed");
    } finally {
      setAudioUploading(false);
    }
  };

  // Step 2 — Dessin Canvas pour le générateur de pochette
  const drawCover = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = 1000;
    const height = 1000;
    canvas.width = width;
    canvas.height = height;

    // 1. Fond sombre de base
    ctx.fillStyle = selectedPreset.bg;
    ctx.fillRect(0, 0, width, height);

    // 2. Dégradés radiaux atmosphériques
    const grad1 = ctx.createRadialGradient(width * 0.2, height * 0.3, 50, width * 0.3, height * 0.3, 600);
    grad1.addColorStop(0, selectedPreset.colors[1] + "DD");
    grad1.addColorStop(1, "transparent");
    ctx.fillStyle = grad1;
    ctx.fillRect(0, 0, width, height);

    const grad2 = ctx.createRadialGradient(width * 0.8, height * 0.7, 50, width * 0.7, height * 0.7, 600);
    grad2.addColorStop(0, selectedPreset.colors[2] + "CC");
    grad2.addColorStop(1, "transparent");
    ctx.fillStyle = grad2;
    ctx.fillRect(0, 0, width, height);

    // 3. Motifs géométriques afro-futuristes
    ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
    ctx.lineWidth = 3;

    // Cercles concentriques
    for (let r = 80; r < 500; r += 70) {
      ctx.beginPath();
      ctx.arc(width * 0.5, height * 0.45, r, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Ondes sonores décoratives
    ctx.fillStyle = selectedPreset.accent;
    const waveCount = 28;
    const startX = 140;
    const waveW = 18;
    const gap = 12;
    for (let i = 0; i < waveCount; i++) {
      const h = 25 + Math.sin(i * 0.5) * 45 + Math.cos(i * 0.8) * 30;
      ctx.globalAlpha = 0.65;
      ctx.fillRect(startX + i * (waveW + gap), height * 0.88 - h, waveW, h);
    }
    ctx.globalAlpha = 1.0;

    // 4. Header Badge (Marque AfroMix)
    ctx.fillStyle = "rgba(255, 255, 255, 0.15)";
    ctx.beginPath();
    ctx.roundRect(80, 80, 240, 50, 25);
    ctx.fill();

    ctx.fillStyle = "#FFFFFF";
    ctx.font = "bold 20px sans-serif";
    ctx.fillText("AFROMIX EXCLUSIVE", 100, 112);

    // Badge Genre
    const genreText = genreLabel(mixGenre, language);
    ctx.fillStyle = selectedPreset.accent;
    ctx.beginPath();
    ctx.roundRect(width - 280, 80, 200, 50, 25);
    ctx.fill();

    ctx.fillStyle = "#000000";
    ctx.font = "bold 20px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(genreText.toUpperCase(), width - 180, 112);
    ctx.textAlign = "left";

    // 5. Grand Titre du Mix
    ctx.fillStyle = "#FFFFFF";
    ctx.font = "900 68px sans-serif";
    const titleText = mixTitle || "SESSION LIVE AFROMIX";

    // Découpage automatique sur 2 lignes si long
    if (titleText.length > 22) {
      const words = titleText.split(" ");
      const mid = Math.ceil(words.length / 2);
      const line1 = words.slice(0, mid).join(" ");
      const line2 = words.slice(mid).join(" ");
      ctx.fillText(line1, 80, height * 0.66);
      ctx.fillText(line2, 80, height * 0.74);
    } else {
      ctx.fillText(titleText, 80, height * 0.70);
    }

    // 6. Nom du DJ
    const artistName = user?.artistProfile?.stageName ?? user?.profile?.displayName ?? "DJ ARTIST";
    ctx.fillStyle = selectedPreset.accent;
    ctx.font = "bold 34px sans-serif";
    ctx.fillText(`CURATED BY ${artistName.toUpperCase()}`, 80, height * 0.80);
  }, [mixTitle, mixGenre, selectedPreset, user, language]);

  useEffect(() => {
    if (step === 2 && coverMode === "generate") {
      drawCover();
    }
  }, [step, coverMode, drawCover]);

  // Step 2 — Upload de la pochette (fichier ou générée)
  const handleCoverUpload = async () => {
    if (!mixId) return;
    setCoverUploading(true);

    try {
      let fileToUpload = coverFile;

      // Si mode génération, conversion du Canvas en File
      if (coverMode === "generate" && canvasRef.current) {
        const blob = await new Promise<Blob | null>((resolve) =>
          canvasRef.current!.toBlob((b) => resolve(b), "image/png")
        );
        if (!blob) throw new Error(tr("Erreur génération image canvas", "Artwork generation failed"));
        fileToUpload = new File([blob], `${mixSlug || "cover"}-artwork.png`, { type: "image/png" });
      }

      if (!fileToUpload) {
        toast.error(language === "fr" ? "Veuillez sélectionner ou générer une image" : "Please select or generate an image");
        setCoverUploading(false);
        return;
      }

      const presign = await mixesApi.presignCover(mixId, fileToUpload.type);
      const { uploadUrl, key } = presign.data;

      await fetch(uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": fileToUpload.type },
        body: fileToUpload,
      });

      await mixesApi.confirmCover(mixId, key);
      toast.success(language === "fr" ? "Pochette enregistrée !" : "Cover saved!");
      setStep(3);
    } catch (err) {
      console.error(err);
      toast.error(language === "fr" ? "Erreur lors du téléversement de la pochette" : "Failed to upload cover");
    } finally {
      setCoverUploading(false);
    }
  };

  // Convertit "mm:ss" ou "hh:mm:ss" en secondes
  const parseTimestamp = (ts: string): number => {
    const parts = ts.split(":").map((p) => parseInt(p, 10));
    if (parts.length === 2) {
      return (parts[0] || 0) * 60 + (parts[1] || 0);
    }
    if (parts.length === 3) {
      return (parts[0] || 0) * 3600 + (parts[1] || 0) * 60 + (parts[2] || 0);
    }
    const direct = parseInt(ts, 10);
    return isNaN(direct) ? 0 : direct;
  };

  // Step 3 — Ajout d'un morceau à la tracklist
  const handleAddTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mixId || !newTrackTitle.trim()) return;

    setAddingTrack(true);
    const startSec = parseTimestamp(newTrackTimestamp);
    const position = tracklist.length;

    try {
      await mixesApi.addToTracklist(mixId, {
        title: newTrackTitle.trim(),
        artistName: newTrackArtist.trim() || undefined,
        position,
        startSec,
      });

      setTracklist((prev) => [
        ...prev,
        {
          title: newTrackTitle.trim(),
          artistName: newTrackArtist.trim() || "Artiste",
          startSec,
        },
      ]);

      setNewTrackTitle("");
      setNewTrackArtist("");
      toast.success(language === "fr" ? "Morceau ajouté à la tracklist !" : "Track added to tracklist!");
    } catch {
      toast.error(language === "fr" ? "Erreur lors de l'ajout du morceau" : "Could not add track");
    } finally {
      setAddingTrack(false);
    }
  };

  // Step 4 — Publication finale
  const handlePublish = async () => {
    if (!mixId) return;
    try {
      await mixesApi.update(mixId, { status: "PUBLISHED" });
      toast.success(language === "fr" ? "Votre mix est en ligne !" : "Mix is live!");
      window.location.href = mixSlug ? `/mixes/${mixSlug}` : "/dashboard";
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : tr("Erreur de publication", "Publishing failed");
      toast.error(message);
    }
  };

  if (user && !isArtist) {
    return (
      <RequireAuth>
        <div className="max-w-lg mx-auto px-4 py-16 text-center space-y-6">
          <div className="h-20 w-20 rounded-3xl bg-gradient-to-tr from-purple-600/30 to-pink-600/30 border border-purple-500/20 flex items-center justify-center mx-auto text-3xl">
            <Headphones className="h-10 w-10 text-purple-400" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-white">
              {language === "fr" ? "Espace Créateurs & DJs" : "Creators & DJs Only"}
            </h1>
            <p className="text-sm text-zinc-400">
              {language === "fr"
                ? tr("Vous devez avoir un profil DJ pour téléverser des mixes.", "You need a DJ profile to upload mixes.")
                : "You must have a DJ profile to upload mixes."}
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            <Button onClick={() => router.push("/profile")} className="gap-2">
              <Sparkles className="h-4 w-4" />
              {language === "fr" ? "Activer mon profil DJ" : "Activate DJ Profile"}
            </Button>
          </div>
        </div>
      </RequireAuth>
    );
  }

  return (
    <RequireAuth role="ARTIST">
      <div className="px-4 lg:px-8 py-8 max-w-3xl mx-auto space-y-8 animate-fade-in">
        {/* Header */}
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/15 border border-purple-500/30 text-purple-300 text-xs font-bold mb-2">
            <Radio className="h-3.5 w-3.5" />
            <span>AfroMix Studio</span>
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight">
            {language === "fr" ? "Téléverser un nouveau Mix" : "Upload a New Mix"}
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            {language === "fr"
              ? tr("Partagez votre set avec la communauté, générez une pochette et listez vos morceaux.", "Share your set with the community, generate artwork and list your tracks.")
              : "Share your set with the community, generate cover art and list your tracks."}
          </p>
        </div>

        {/* Steps indicator */}
        <div className="flex items-center gap-1">
          {STEPS.map((s, i) => (
            <div key={i} className="flex items-center gap-1 flex-1">
              <div
                className={cn(
                  "h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 transition-all",
                  i < step
                    ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/20"
                    : i === step
                    ? "bg-purple-600 text-white shadow-lg shadow-purple-600/30 ring-2 ring-purple-400/30"
                    : "bg-white/[0.06] text-zinc-500"
                )}
              >
                {i < step ? <Check className="h-4 w-4" /> : i + 1}
              </div>
              {i < STEPS.length - 1 && (
                <div
                  className={cn(
                    "flex-1 h-0.5 rounded",
                    i < step ? "bg-emerald-500/50" : "bg-white/[0.08]"
                  )}
                />
              )}
            </div>
          ))}
        </div>

        {/* ─── ÉTAPE 0 : MÉTADONNÉES ────────────────────────────────────────── */}
        {step === 0 && (
          <form onSubmit={handleSubmit(onMetaSubmit)} className="space-y-5 rounded-3xl bg-[#111318] border border-white/[0.08] p-6 sm:p-8">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Disc3 className="h-5 w-5 text-purple-400" />
              <span>{language === "fr" ? "1. Informations générales" : "1. General Information"}</span>
            </h2>

            <Input
              label={language === "fr" ? "Titre du mix *" : "Mix Title *"}
              placeholder={tr("Ex: Amapiano Lagos Sunset Vol. 3", "E.g. Amapiano Lagos Sunset Vol. 3")}
              error={errors.title?.message}
              {...register("title")}
            />

            <div>
              <label className="text-sm font-semibold text-zinc-300 block mb-1.5">
                {language === "fr" ? "Description / Notes de set" : "Description / Set notes"}
              </label>
              <textarea
                {...register("description")}
                rows={3}
                placeholder={
                  language === "fr"
                    ? tr("Enregistré en direct au Rooftop Abidjan. Les meilleures pépites de la semaine...", "Recorded live at Rooftop Abidjan. The week's best gems...")
                    : "Recorded live at Lagos Club. Highlights of this week..."
                }
                className="w-full rounded-xl bg-[#181a20] border border-white/10 p-3 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-purple-500/40 resize-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Select
                label={language === "fr" ? "Genre musical *" : "Genre *"}
                error={errors.genre?.message}
                {...register("genre")}
              >
                {Object.entries(GENRE_LABELS).map(([id, label]) => (
                  <option key={id} value={id}>
                    {label}
                  </option>
                ))}
              </Select>

              <Select
                label={language === "fr" ? "Type de set *" : "Mix Type *"}
                error={errors.mixType?.message}
                {...register("mixType")}
              >
                {Object.entries(MIX_TYPE_LABELS).map(([id, label]) => (
                  <option key={id} value={id}>
                    {label}
                  </option>
                ))}
              </Select>
            </div>

            <Input
              label={language === "fr" ? "Tags (séparés par virgules)" : "Tags (comma separated)"}
              placeholder="afrobeats, club, live, accra, lagos"
              {...register("tags")}
            />

            <div className="pt-2">
              <Button type="submit" isLoading={isSubmitting} className="w-full gap-2">
                <span>{language === "fr" ? "Créer et passer à l'audio" : "Save & Proceed to Audio"}</span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </form>
        )}

        {/* ─── ÉTAPE 1 : AUDIO & EXTRACTION DURÉE ──────────────────────────── */}
        {step === 1 && (
          <div className="space-y-6 rounded-3xl bg-[#111318] border border-white/[0.08] p-6 sm:p-8">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <FileAudio className="h-5 w-5 text-purple-400" />
              <span>{language === "fr" ? "2. Téléversement de l'audio" : "2. Audio Upload"}</span>
            </h2>

            <div
              className={cn(
                "rounded-2xl border-2 border-dashed p-8 text-center transition-all",
                audioDone
                  ? "border-emerald-500/40 bg-emerald-500/5"
                  : audioUploading
                  ? "border-purple-500/40 bg-purple-500/5"
                  : "border-white/[0.12] hover:border-purple-500/40"
              )}
            >
              {audioDone ? (
                <div className="flex flex-col items-center gap-2">
                  <div className="h-14 w-14 rounded-full bg-emerald-500/20 flex items-center justify-center">
                    <Check className="h-7 w-7 text-emerald-400" />
                  </div>
                  <p className="text-base font-bold text-emerald-400">
                    {language === "fr" ? "Audio prêt & enregistré !" : "Audio ready & saved!"}
                  </p>
                  {detectedDuration && (
                    <p className="text-xs text-zinc-400 flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 text-purple-400" />
                      <span>{language === "fr" ? "Durée détectée :" : "Detected duration:"} <b>{formatDuration(detectedDuration)}</b></span>
                    </p>
                  )}
                </div>
              ) : audioUploading ? (
                <div className="flex flex-col items-center gap-4 py-4 max-w-md mx-auto">
                  <Loader2 className="h-8 w-8 text-purple-400 animate-spin" />
                  <div className="w-full bg-white/[0.08] rounded-full h-2.5 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-purple-500 via-pink-500 to-amber-500 transition-all duration-200"
                      style={{ width: `${audioProgress}%` }}
                    />
                  </div>
                  <p className="text-sm font-semibold text-white">
                    {audioProgress}% — {language === "fr" ? "Transfert en cours vers le stockage..." : "Uploading to storage..."}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <Music2 className="h-12 w-12 text-zinc-500 mx-auto" />
                  <div>
                    <p className="text-base font-bold text-white mb-1">
                      {audioFile ? audioFile.name : language === "fr" ? "Déposez votre fichier audio ici" : "Drop your audio file here"}
                    </p>
                    <p className="text-xs text-zinc-400">
                      {audioFile
                        ? `${(audioFile.size / (1024 * 1024)).toFixed(1)} ${tr("Mo", "MB")}`
                        : tr("MP3, WAV, AIFF, FLAC, OGG — jusqu'à 500 Mo", "MP3, WAV, AIFF, FLAC, OGG — up to 500 MB")}
                    </p>
                    {detectedDuration && (
                      <p className="text-xs text-purple-400 font-semibold mt-1 inline-flex items-center gap-1.5">
                        <Timer className="h-3.5 w-3.5" /> {language === "fr" ? "Durée détectée :" : "Detected duration:"} {formatDuration(detectedDuration)}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                    <label className="cursor-pointer">
                      <span className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-purple-600 text-white text-sm font-bold hover:bg-purple-500 transition-colors shadow-lg shadow-purple-600/25">
                        <Upload className="h-4 w-4" />
                        <span>{audioFile ? (language === "fr" ? "Changer de fichier" : "Change file") : (language === "fr" ? "Choisir un fichier" : "Choose file")}</span>
                      </span>
                      <input type="file" accept="audio/*" className="hidden" onChange={handleAudioSelect} />
                    </label>

                    {audioFile && (
                      <Button onClick={handleAudioUpload} className="gap-2">
                        <Upload className="h-4 w-4" />
                        <span>{language === "fr" ? "Démarrer l'upload" : "Start upload"}</span>
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-2">
              <Button variant="ghost" size="sm" onClick={() => setStep(0)} className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                <span>{language === "fr" ? "Retour aux infos" : "Back"}</span>
              </Button>
              <Button onClick={() => setStep(2)} disabled={!audioDone} className="gap-2">
                <span>{language === "fr" ? "Étape suivante : Pochette" : "Next: Cover"}</span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* ─── ÉTAPE 2 : POCHETTE (UPLOAD OU GÉNÉRATEUR AFROMIX) ────────────── */}
        {step === 2 && (
          <div className="space-y-6 rounded-3xl bg-[#111318] border border-white/[0.08] p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <ImageIcon className="h-5 w-5 text-purple-400" />
                <span>{language === "fr" ? "3. Pochette du mix" : "3. Cover Artwork"}</span>
              </h2>

              {/* Toggle Mode */}
              <div className="flex items-center gap-1 bg-white/[0.04] p-1 rounded-2xl border border-white/[0.08]">
                <button
                  type="button"
                  onClick={() => setCoverMode("upload")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    coverMode === "upload" ? "bg-purple-600 text-white shadow-sm" : "text-zinc-400 hover:text-white"
                  }`}
                >
                  {language === "fr" ? "Mon Image" : "Upload File"}
                </button>
                <button
                  type="button"
                  onClick={() => setCoverMode("generate")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    coverMode === "generate" ? "bg-purple-600 text-white shadow-sm" : "text-zinc-400 hover:text-white"
                  }`}
                >
                  <Sparkles className="h-3 w-3" />
                  <span>{language === "fr" ? "Générateur Studio" : "Studio Generator"}</span>
                </button>
              </div>
            </div>

            {/* Mode 1: Upload personnalisé */}
            {coverMode === "upload" && (
              <div className="rounded-2xl border-2 border-dashed border-white/[0.12] hover:border-purple-500/40 p-8 text-center transition-colors">
                {coverFile ? (
                  <div className="flex flex-col items-center gap-3">
                    {/* Aperçu local (URL blob) : next/image n'apporte rien ici */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={coverPreviewUrl ?? undefined}
                      alt="preview"
                      className="w-44 h-44 object-cover rounded-2xl shadow-xl border border-white/10"
                    />
                    <p className="text-sm font-semibold text-white">{coverFile.name}</p>
                    <label className="cursor-pointer text-xs text-purple-400 hover:text-purple-300">
                      <span>{language === "fr" ? "Choisir une autre image" : "Choose different image"}</span>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) {
                            setCoverFile(f);
                            if (coverPreviewUrl) URL.revokeObjectURL(coverPreviewUrl);
                            setCoverPreviewUrl(URL.createObjectURL(f));
                          }
                        }}
                      />
                    </label>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <ImageIcon className="h-10 w-10 text-zinc-500 mx-auto" />
                    <div>
                      <p className="text-sm font-bold text-white">
                        {language === "fr" ? "Sélectionnez votre pochette carrée" : "Select square cover artwork"}
                      </p>
                      <p className="text-xs text-zinc-400">{tr("JPG, PNG ou WEBP (recommandé : 1400×1400 px ou plus)", "JPG, PNG or WEBP (recommended: 1400×1400 px or more)")}</p>
                    </div>
                    <label className="cursor-pointer inline-block pt-1">
                      <span className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-purple-600 text-white text-sm font-bold hover:bg-purple-500 transition-colors shadow-lg shadow-purple-600/25">
                        <Upload className="h-4 w-4" />
                        <span>{language === "fr" ? "Parcourir" : "Browse files"}</span>
                      </span>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) {
                            setCoverFile(f);
                            if (coverPreviewUrl) URL.revokeObjectURL(coverPreviewUrl);
                            setCoverPreviewUrl(URL.createObjectURL(f));
                          }
                        }}
                      />
                    </label>
                  </div>
                )}
              </div>
            )}

            {/* Mode 2: Générateur de pochette AfroMix Studio */}
            {coverMode === "generate" && (
              <div className="space-y-5 animate-fade-in">
                <div className="flex flex-col sm:flex-row items-center gap-6">
                  {/* Canvas Preview */}
                  <div className="relative w-52 h-52 sm:w-60 sm:h-60 rounded-2xl overflow-hidden shadow-2xl border-2 border-purple-500/30 flex-shrink-0 bg-black">
                    <canvas ref={canvasRef} className="w-full h-full object-cover" />
                  </div>

                  {/* Settings & Presets */}
                  <div className="space-y-4 flex-1 w-full">
                    <div>
                      <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <Palette className="h-3.5 w-3.5 text-purple-400" />
                        <span>{language === "fr" ? "Thème visuel" : "Visual Theme"}</span>
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {COVER_PRESETS.map((p) => (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => setSelectedPreset(p)}
                            className={cn(
                              "flex items-center gap-3 p-2.5 rounded-xl border text-left transition-all",
                              selectedPreset.id === p.id
                                ? "bg-purple-600/20 border-purple-500 text-white"
                                : "bg-white/[0.03] border-white/10 text-zinc-400 hover:text-white"
                            )}
                          >
                            <div
                              className="h-6 w-6 rounded-lg flex-shrink-0 shadow-sm"
                              style={{ background: `linear-gradient(135deg, ${p.colors[1]}, ${p.colors[2]})` }}
                            />
                            <span className="text-xs font-bold truncate">{p.name}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 text-xs text-purple-200 flex items-center gap-2">
                      <Lightbulb className="h-4 w-4 text-amber-400 flex-shrink-0" />
                      <span><b>AfroMix Studio</b> {tr("compose le visuel avec votre titre", "builds the artwork with your title")} (<b>{mixTitle || tr("Sans titre", "Untitled")}</b>) {tr("et votre nom de DJ.", "and your DJ name.")}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-between pt-2">
              <Button variant="ghost" size="sm" onClick={() => setStep(1)} className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                <span>{language === "fr" ? "Retour" : "Back"}</span>
              </Button>

              <div className="flex items-center gap-2">
                <Button variant="secondary" size="sm" onClick={() => setStep(3)}>
                  <span>{language === "fr" ? "Passer cette étape" : "Skip"}</span>
                </Button>

                <Button onClick={handleCoverUpload} isLoading={coverUploading} className="gap-2">
                  <span>{language === "fr" ? "Enregistrer & Tracklist" : "Save & Proceed"}</span>
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* ─── ÉTAPE 3 : TRACKLIST ORDONNÉE ────────────────────────────────── */}
        {step === 3 && (
          <div className="space-y-6 rounded-3xl bg-[#111318] border border-white/[0.08] p-6 sm:p-8">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <ListMusic className="h-5 w-5 text-purple-400" />
                <span>{language === "fr" ? "4. Tracklist du set" : "4. Set Tracklist"}</span>
              </h2>
              <p className="text-xs text-zinc-400 mt-1">
                {language === "fr"
                  ? tr("Indiquez les morceaux joués pour permettre aux auditeurs de sauter directement aux passages clés.", "List the tracks played so listeners can jump straight to key moments.")
                  : "List the tracks played so listeners can jump directly to their favorite parts."}
              </p>
            </div>

            {/* Formulaire d'ajout rapide */}
            <form onSubmit={handleAddTrack} className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.08] space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                <div className="sm:col-span-6">
                  <Input
                    placeholder={language === "fr" ? "Titre du morceau (ex: City Boys)" : "Track title"}
                    value={newTrackTitle}
                    onChange={(e) => setNewTrackTitle(e.target.value)}
                    required
                  />
                </div>
                <div className="sm:col-span-4">
                  <Input
                    placeholder={language === "fr" ? "Artiste (ex: Burna Boy)" : "Artist name"}
                    value={newTrackArtist}
                    onChange={(e) => setNewTrackArtist(e.target.value)}
                  />
                </div>
                <div className="sm:col-span-2">
                  <Input
                    placeholder="00:00"
                    value={newTrackTimestamp}
                    onChange={(e) => setNewTrackTimestamp(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <Button type="submit" size="sm" isLoading={addingTrack} className="gap-1.5">
                  <Plus className="h-4 w-4" />
                  <span>{language === "fr" ? "Ajouter ce morceau" : "Add Track"}</span>
                </Button>
              </div>
            </form>

            {/* Liste ordonnée actuelle */}
            <div className="space-y-2">
              <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                {language === "fr" ? `Morceaux enregistrés (${tracklist.length})` : `Saved tracks (${tracklist.length})`}
              </p>

              {tracklist.length === 0 ? (
                <div className="py-8 text-center border border-dashed border-white/10 rounded-2xl text-zinc-500 text-xs">
                  {language === "fr"
                    ? tr("Aucun morceau ajouté pour l'instant. Vous pouvez en ajouter ou passer à la publication.", "No tracks added yet. Add some or go straight to publishing.")
                    : "No tracks added yet. You can add tracks or proceed to publish."}
                </div>
              ) : (
                <div className="divide-y divide-white/[0.05] rounded-2xl bg-white/[0.02] border border-white/[0.06] overflow-hidden">
                  {tracklist.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-3 px-4 py-3 text-sm">
                      <span className="w-6 text-xs font-bold text-zinc-500">{idx + 1}</span>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-white truncate">{item.title}</p>
                        <p className="text-xs text-zinc-400 truncate">{item.artistName}</p>
                      </div>
                      <span className="text-xs font-mono text-purple-400 px-2 py-0.5 rounded bg-purple-500/10">
                        {formatDuration(item.startSec)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Navigation */}
            <div className="flex items-center justify-between pt-2">
              <Button variant="ghost" size="sm" onClick={() => setStep(2)} className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                <span>{language === "fr" ? "Retour à la pochette" : "Back"}</span>
              </Button>
              <Button onClick={() => setStep(4)} className="gap-2">
                <span>{language === "fr" ? "Étape finale : Publication" : "Next: Publish"}</span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* ─── ÉTAPE 4 : RÉCAPITULATIF & PUBLICATION ───────────────────────── */}
        {step === 4 && (
          <div className="space-y-6 rounded-3xl bg-[#111318] border border-white/[0.08] p-6 sm:p-8 text-center animate-fade-in">
            <div className="h-16 w-16 rounded-[18px] bg-brand-gradient flex items-center justify-center mx-auto shadow-xl shadow-brand/30">
              <AfromixSymbol size={44} tone="white" />
            </div>

            <div>
              <h2 className="text-2xl font-black text-white">
                {language === "fr" ? "Votre mix est prêt à vibrer !" : "Your mix is ready to launch!"}
              </h2>
              <p className="text-xs sm:text-sm text-zinc-400 mt-1 max-w-md mx-auto">
                {language === "fr"
                  ? tr("Toutes les étapes sont complétées. Cliquez sur Publier pour le rendre disponible aux auditeurs.", "All steps are done. Click Publish to make it available to listeners.")
                  : "All steps completed. Click Publish to make it available to all listeners."}
              </p>
            </div>

            {/* Carte Récapitulative */}
            <div className="max-w-md mx-auto p-4 rounded-2xl bg-white/[0.04] border border-white/[0.08] text-left space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs px-2.5 py-1 rounded-full bg-purple-500/20 text-purple-300 font-bold border border-purple-500/30">
                  {genreLabel(mixGenre, language)}
                </span>
                {detectedDuration && (
                  <span className="text-xs text-zinc-400 font-mono inline-flex items-center gap-1.5">
                    <Timer className="h-3.5 w-3.5" /> {formatDuration(detectedDuration)}
                  </span>
                )}
              </div>
              <h3 className="text-lg font-bold text-white">{mixTitle || "Mix sans titre"}</h3>
              <p className="text-xs text-zinc-400">
                {language === "fr" ? "Par" : "By"} <b>{user?.artistProfile?.stageName ?? user?.profile?.displayName}</b> · {tracklist.length} {language === "fr" ? "morceaux dans la tracklist" : "tracks in tracklist"}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <Button variant="ghost" size="sm" onClick={() => setStep(3)}>
                <ArrowLeft className="h-4 w-4" />
                <span>{language === "fr" ? "Modifier" : "Edit"}</span>
              </Button>

              <Button size="lg" onClick={handlePublish} className="gap-2 shadow-xl shadow-purple-600/30">
                <Sparkles className="h-4 w-4" />
                <span>{language === "fr" ? "Publier mon mix maintenant" : "Publish Mix Now"}</span>
              </Button>
            </div>
          </div>
        )}
      </div>
    </RequireAuth>
  );
}
