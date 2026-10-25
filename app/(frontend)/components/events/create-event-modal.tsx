"use client";

import { useState, useRef, useCallback } from "react";
import { createPortal } from "react-dom";import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  X,
  Calendar,
  MapPin,
  Ticket,
  Image as ImageIcon,
  Sparkles,
  Loader2,
  User,
  Upload,
  Trash2,
} from "lucide-react";
import { eventsApi, type CreateEventInput } from "@/app/(frontend)/lib/api/events";
import { artistsApi } from "@/app/(frontend)/lib/api/artists";
import { useAuth } from "@/app/(frontend)/providers/auth-provider";
import { useI18n } from "@/app/(frontend)/providers/i18n-provider";
import { toast } from "sonner";
import { useIsClient } from "@/app/(frontend)/hooks/use-is-client";

interface CreateEventModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CreateEventModal({ isOpen, onClose }: CreateEventModalProps) {
  const { isAdmin } = useAuth();
  const { language, tr } = useI18n();
  const queryClient = useQueryClient();
  const mounted = useIsClient();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [venue, setVenue] = useState("");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("");
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");
  const [ticketUrl, setTicketUrl] = useState("");
  const [selectedArtistId, setSelectedArtistId] = useState("");

  // Cover upload state
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [coverUploading, setCoverUploading] = useState(false);
  const [coverUploadProgress, setCoverUploadProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Only load artist list if admin
  const { data: artistsData } = useQuery({
    queryKey: ["artists-list-select"],
    queryFn: () => artistsApi.list({ pageSize: 50 }),
    enabled: isOpen && isAdmin,
  });

  const artists = artistsData?.data ?? [];

  // Handle file selection (from input or drag-and-drop)
  const handleFileSelect = useCallback((file: File) => {
    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      toast.error(
        language === "fr"
          ? tr("Format non supporté. Utilisez JPEG, PNG ou WebP.", "Unsupported format. Use JPEG, PNG or WebP.")
          : "Unsupported format. Use JPEG, PNG, or WebP."
      );
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error(
        language === "fr" ? "Image trop lourde (max 10 MB)" : "Image too large (max 10 MB)"
      );
      return;
    }
    setCoverFile(file);
    const objectUrl = URL.createObjectURL(file);
    setCoverPreview(objectUrl);
  }, [language, tr]);

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileSelect(file);
  };

  const removeCover = () => {
    setCoverFile(null);
    if (coverPreview) {
      URL.revokeObjectURL(coverPreview);
      setCoverPreview(null);
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Drag-and-drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileSelect(file);
  };

  // Upload cover to R2/S3 and return the CDN URL
  const uploadCoverToStorage = async (file: File): Promise<string | null> => {
    try {
      setCoverUploading(true);
      setCoverUploadProgress(0);

      // 1. Get presigned URL
      const presignRes = await eventsApi.presignCover(file.name, file.type);
      const { uploadUrl, cdnUrl } = presignRes.data;

      // 2. Upload via XHR for progress tracking
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.upload.onprogress = (ev) => {
          if (ev.lengthComputable) {
            setCoverUploadProgress(Math.round((ev.loaded / ev.total) * 100));
          }
        };
        xhr.onload = () =>
          xhr.status < 300 ? resolve() : reject(new Error(`Upload failed: ${xhr.status}`));
        xhr.onerror = () => reject(new Error("Upload network error"));
        xhr.open("PUT", uploadUrl);
        xhr.setRequestHeader("Content-Type", file.type);
        xhr.send(file);
      });

      setCoverUploadProgress(100);
      return cdnUrl;
    } catch (err) {
      console.error("Cover upload error:", err);
      toast.error(
        language === "fr"
          ? tr("Erreur lors de l'upload de l'image", "Image upload failed")
          : "Failed to upload cover image"
      );
      return null;
    } finally {
      setCoverUploading(false);
    }
  };

  const createMutation = useMutation({
    mutationFn: (input: CreateEventInput) => eventsApi.create(input),
    onSuccess: () => {
      if (isAdmin) {
        toast.success(
          language === "fr"
            ? tr("Événement créé et publié avec succès !", "Event created and published!")
            : "Event created and published successfully!"
        );
      } else {
        toast.success(
          language === "fr"
            ? tr("Événement soumis ! Il sera visible dès validation par un administrateur.", "Event submitted! It will appear once an admin approves it.")
            : "Event submitted! It will appear once approved by an admin."
        );
      }
      queryClient.invalidateQueries({ queryKey: ["events"] });
      handleClose();
    },
    onError: (err: Error) => {
      const msg = err?.message || (language === "fr" ? "Erreur lors de la création" : "Failed to create event");
      toast.error(msg);
    },
  });

  const handleClose = () => {
    setTitle("");
    setDescription("");
    setVenue("");
    setCity("");
    setCountry("");
    setStartAt("");
    setEndAt("");
    setTicketUrl("");
    setSelectedArtistId("");
    removeCover();
    onClose();
  };

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error(language === "fr" ? "Veuillez entrer un titre" : "Please provide a title");
      return;
    }
    if (!startAt) {
      toast.error(language === "fr" ? "Veuillez choisir une date de début" : "Please provide a start date");
      return;
    }

    setIsSubmitting(true);

    // Upload cover if a file is selected
    let finalCoverUrl: string | undefined;
    if (coverFile) {
      const url = await uploadCoverToStorage(coverFile);
      if (url) {
        finalCoverUrl = url;
      }
      // If upload fails, we still allow creating the event without cover
    }

    const payload: CreateEventInput = {
      title: title.trim(),
      description: description.trim() || undefined,
      venue: venue.trim() || undefined,
      city: city.trim() || undefined,
      country: country.trim() || undefined,
      startAt: new Date(startAt).toISOString(),
      endAt: endAt ? new Date(endAt).toISOString() : undefined,
      ticketUrl: ticketUrl.trim() || undefined,
      coverUrl: finalCoverUrl,
      artistId: isAdmin && selectedArtistId ? selectedArtistId : undefined,
    };

    createMutation.mutate(payload);
    setIsSubmitting(false);
  };

  const isBusy = isSubmitting || coverUploading || createMutation.isPending;

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-black/85 backdrop-blur-md animate-fade-in"
      onClick={handleClose}
    >
      <div
        className="relative w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-3xl bg-[#111318] border border-white/10 p-6 sm:p-8 shadow-2xl text-white space-y-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={handleClose}
          className="absolute top-5 right-5 h-9 w-9 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-zinc-400 hover:text-white transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Modal Header */}
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-xs font-semibold">
            <Sparkles className="h-3.5 w-3.5" />
            <span>{isAdmin ? "Admin & DJ Events" : "Espace DJ"}</span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-white">
            {language === "fr" ? "Créer un nouvel événement" : "Create a New Event"}
          </h2>
          <p className="text-xs sm:text-sm text-zinc-400">
            {language === "fr"
              ? tr("Publiez vos concerts, festivals, tournées et sets DJ pour vos fans.", "Post your concerts, festivals, tours and DJ sets for your fans.")
              : "Publish your concerts, festivals, tours, and DJ sets for your fans."}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
              {language === "fr" ? "Titre de l'événement *" : "Event Title *"}
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={language === "fr" ? "ex: Afro Nation Festival 2026" : "e.g. Afro Nation Festival 2026"}
              className="w-full h-11 px-4 rounded-xl bg-white/[0.04] border border-white/10 text-white placeholder-zinc-500 text-sm focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all"
            />
          </div>

          {/* Dates row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5 flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-purple-400" />
                {language === "fr" ? "Date & Heure de début *" : "Start Date & Time *"}
              </label>
              <input
                type="datetime-local"
                required
                value={startAt}
                onChange={(e) => setStartAt(e.target.value)}
                className="w-full h-11 px-4 rounded-xl bg-white/[0.04] border border-white/10 text-white text-sm focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all [color-scheme:dark]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5 flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-zinc-400" />
                {language === "fr" ? "Date & Heure de fin (optionnel)" : "End Date & Time (optional)"}
              </label>
              <input
                type="datetime-local"
                value={endAt}
                onChange={(e) => setEndAt(e.target.value)}
                className="w-full h-11 px-4 rounded-xl bg-white/[0.04] border border-white/10 text-white text-sm focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all [color-scheme:dark]"
              />
            </div>
          </div>

          {/* Location row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5 flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-purple-400" />
                {language === "fr" ? "Lieu / Salle" : "Venue"}
              </label>
              <input
                type="text"
                value={venue}
                onChange={(e) => setVenue(e.target.value)}
                placeholder={tr("ex: Palais des Congrès", "e.g. Palais des Congrès")}
                className="w-full h-11 px-4 rounded-xl bg-white/[0.04] border border-white/10 text-white placeholder-zinc-500 text-sm focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
                {language === "fr" ? "Ville" : "City"}
              </label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder={tr("ex: Lomé, Paris, Accra", "e.g. Lomé, Paris, Accra")}
                className="w-full h-11 px-4 rounded-xl bg-white/[0.04] border border-white/10 text-white placeholder-zinc-500 text-sm focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
                {language === "fr" ? "Pays" : "Country"}
              </label>
              <input
                type="text"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                placeholder={tr("ex: Togo, France, Ghana", "e.g. Togo, France, Ghana")}
                className="w-full h-11 px-4 rounded-xl bg-white/[0.04] border border-white/10 text-white placeholder-zinc-500 text-sm focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all"
              />
            </div>
          </div>

          {/* Ticket URL */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5 flex items-center gap-1.5">
              <Ticket className="h-3.5 w-3.5 text-pink-400" />
              {language === "fr" ? "Lien Billetterie" : "Ticket Link"}
            </label>
            <input
              type="url"
              value={ticketUrl}
              onChange={(e) => setTicketUrl(e.target.value)}
              placeholder="https://shotgun.live/..."
              className="w-full h-11 px-4 rounded-xl bg-white/[0.04] border border-white/10 text-white placeholder-zinc-500 text-sm focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all"
            />
          </div>

          {/* Cover Image Upload Zone */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5 flex items-center gap-1.5">
              <ImageIcon className="h-3.5 w-3.5 text-amber-400" />
              {language === "fr" ? "Affiche / Cover de l'événement" : "Event Cover Image"}
            </label>

            {coverPreview ? (
              /* ── Preview Mode ── */
              <div className="relative group rounded-2xl overflow-hidden border border-white/10 bg-white/[0.02]">
                {/* Aperçu local du fichier choisi : next/image n'apporte rien ici */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={coverPreview}
                  alt={tr("Cover preview", tr("Cover preview", "Cover preview"))}
                  className="w-full h-48 object-cover"
                />
                {/* Upload progress overlay */}
                {coverUploading && (
                  <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center gap-3">
                    <Loader2 className="h-8 w-8 text-purple-400 animate-spin" />
                    <div className="w-3/4 bg-white/10 rounded-full h-2">
                      <div
                        className="h-2 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-300"
                        style={{ width: `${coverUploadProgress}%` }}
                      />
                    </div>
                    <p className="text-xs text-zinc-300">
                      {coverUploadProgress}% {language === "fr" ? "uploadé..." : "uploaded..."}
                    </p>
                  </div>
                )}
                {/* Gradient overlay with file info */}
                {!coverUploading && (
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-4">
                    <div className="flex items-center justify-between w-full">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-white truncate">
                          {coverFile?.name}
                        </p>
                        <p className="text-xs text-zinc-400">
                          {coverFile && `${(coverFile.size / (1024 * 1024)).toFixed(1)} MB`}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={removeCover}
                        className="flex-shrink-0 h-9 w-9 rounded-full bg-red-500/20 hover:bg-red-500/40 border border-red-500/30 flex items-center justify-center text-red-400 hover:text-red-300 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* ── Drag & Drop Zone ── */
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`relative cursor-pointer rounded-2xl border-2 border-dashed p-8 text-center transition-all duration-300 ${
                  isDragging
                    ? "border-purple-500 bg-purple-500/10 scale-[1.01]"
                    : "border-white/[0.12] hover:border-purple-500/40 hover:bg-white/[0.02]"
                }`}
              >
                <div className="flex flex-col items-center gap-3">
                  <div
                    className={`h-14 w-14 rounded-2xl flex items-center justify-center transition-colors duration-300 ${
                      isDragging
                        ? "bg-purple-500/20 text-purple-400"
                        : "bg-white/[0.04] text-zinc-500"
                    }`}
                  >
                    <Upload className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">
                      {isDragging
                        ? language === "fr"
                          ? tr("Déposez l'image ici...", "Drop the image here...")
                          : "Drop image here..."
                        : language === "fr"
                        ? tr("Glissez-déposez ou cliquez pour importer", "Drag and drop or click to upload")
                        : "Drag & drop or click to upload"}
                    </p>
                    <p className="text-xs text-zinc-500 mt-1">
                      {tr("JPEG, PNG, WebP — max 10 MB", tr("JPEG, PNG, WebP — max 10 MB", "JPEG, PNG, WebP — max 10 MB"))}
                    </p>
                  </div>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={handleFileInputChange}
                />
              </div>
            )}
          </div>

          {/* If ADMIN: Option to associate with a DJ */}
          {isAdmin && (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5 flex items-center gap-1.5">
                <User className="h-3.5 w-3.5 text-purple-400" />
                {language === "fr" ? "Associer à un DJ (Optionnel pour l'Admin)" : "Assign to a DJ (Optional for Admin)"}
              </label>
              <select
                value={selectedArtistId}
                onChange={(e) => setSelectedArtistId(e.target.value)}
                className="w-full h-11 px-4 rounded-xl bg-zinc-900 border border-white/10 text-white text-sm focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all [color-scheme:dark] [&>option]:bg-zinc-900 [&>option]:text-white"
              >
                <option value="">
                  {language === "fr" ? "-- Événement général AfroMix (sans DJ spécifique) --" : "-- General AfroMix Event (no specific DJ) --"}
                </option>
                {artists.map((art) => (
                  <option key={art.id} value={art.id}>
                    {art.stageName} {art.country ? `(${art.country})` : ""}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
              Description
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={
                language === "fr"
                  ? tr("Détails sur l'événement, programmation, informations pratiques...", "Event details, line-up, practical info...")
                  : "Event details, lineup, venue instructions..."
              }
              className="w-full p-4 rounded-xl bg-white/[0.04] border border-white/10 text-white placeholder-zinc-500 text-sm focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all resize-none"
            />
          </div>

          {/* Submit Actions */}
          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={handleClose}
              disabled={isBusy}
              className="px-5 py-2.5 rounded-full text-sm font-semibold text-zinc-400 hover:text-white bg-white/[0.05] hover:bg-white/[0.10] transition-colors disabled:opacity-50"
            >
              {language === "fr" ? "Annuler" : "Cancel"}
            </button>
            <button
              type="submit"
              disabled={isBusy}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-semibold text-white bg-gradient-to-r from-purple-600 via-pink-600 to-amber-500 hover:opacity-95 shadow-lg shadow-purple-600/30 transition-all disabled:opacity-50"
            >
              {isBusy ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>
                    {coverUploading
                      ? language === "fr"
                        ? "Upload de l'image..."
                        : "Uploading image..."
                      : language === "fr"
                      ? tr("Création en cours...", "Creating...")
                      : "Creating..."}
                  </span>
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  <span>{language === "fr" ? "Publier l'événement" : "Publish Event"}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
