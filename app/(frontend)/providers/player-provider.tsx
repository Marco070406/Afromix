"use client";

import {
  createContext, useContext, useRef, useState,
  useCallback, useEffect, type ReactNode,
} from "react";
import { mixesApi } from "@/app/(frontend)/lib/api/mixes";

const PLAYER_STORAGE_KEY = "afromix_player_state";
const SAVE_INTERVAL_MS = 3000;

export interface PlayerTrack {
  id: string;
  slug: string;
  title: string;
  audioUrl: string;
  coverUrl: string | null;
  durationSec: number | null;
  artist: { id: string; slug: string; stageName: string; avatarUrl: string | null };
  type: "mix" | "track";
}

interface PlayerState {
  track: PlayerTrack | null;
  queue: PlayerTrack[];
  queueIndex: number;
  isPlaying: boolean;
  isLoading: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  isShuffled: boolean;
  repeatMode: "none" | "one" | "all";
}

interface PlayerActions {
  play: (track: PlayerTrack, queue?: PlayerTrack[]) => void;
  pause: () => void;
  resume: () => void;
  togglePlay: () => void;
  seek: (seconds: number) => void;
  setVolume: (v: number) => void;
  toggleMute: () => void;
  next: () => void;
  prev: () => void;
  toggleShuffle: () => void;
  cycleRepeat: () => void;
  addToQueue: (track: PlayerTrack) => void;
  removeFromQueue: (index: number) => void;
  jumpToQueueIndex: (index: number) => void;
  clearQueue: () => void;
}

const PlayerContext = createContext<(PlayerState & PlayerActions) | null>(null);

export function PlayerProvider({ children }: { children: ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [track, setTrack] = useState<PlayerTrack | null>(null);
  const [queue, setQueue] = useState<PlayerTrack[]>([]);
  const [queueIndex, setQueueIndex] = useState(0);
  const [queueVersion, setQueueVersion] = useState(0); // incrémenté à chaque changement de queue pour forcer le reload
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);
  const [isShuffled, setIsShuffled] = useState(false);
  const [repeatMode, setRepeatMode] = useState<"none" | "one" | "all">("none");
  const playCountedRef = useRef<string | null>(null);
  // Refs pour les callbacks utilisés dans des effets sans dépendances circulaires
  const handleEndedRef = useRef<() => void>(() => {});
  const loadTrackRef = useRef<(t: PlayerTrack) => void>(() => {});
  const isShuffledRef = useRef(false);
  // Restauration après rechargement : le titre est déjà chargé, l'effet de file ne doit pas le relancer
  const skipQueueLoadRef = useRef(false);
  const pendingSeekRef = useRef<number | null>(null); // position à rejoindre dès que l'audio est prêt
  const pendingResumeRef = useRef(false); // la lecture était en cours avant le rechargement
  const removeGestureListenerRef = useRef<() => void>(() => {});
  const persistRef = useRef<() => void>(() => {});
  const lastSaveRef = useRef(0);

  // Init audio element — une seule fois au mount
  useEffect(() => {
    const audio = new Audio();
    audio.volume = volume;
    audioRef.current = audio;

    const onTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
      if (Date.now() - lastSaveRef.current > SAVE_INTERVAL_MS) persistRef.current();
    };
    const onDurationChange = () => {
      if (Number.isFinite(audio.duration)) setDuration(audio.duration);
    };
    // Délègue à la ref : toujours la version fraîche de handleEnded
    const onEnded = () => handleEndedRef.current();
    const onCanPlay = () => setIsLoading(false);
    const onWaiting = () => setIsLoading(true);

    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("durationchange", onDurationChange);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("canplay", onCanPlay);
    audio.addEventListener("waiting", onWaiting);

    return () => {
      audio.pause();
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("durationchange", onDurationChange);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("canplay", onCanPlay);
      audio.removeEventListener("waiting", onWaiting);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleEnded = useCallback(() => {
    setIsPlaying(false);
    if (repeatMode === "one") {
      audioRef.current!.currentTime = 0;
      audioRef.current!.play().then(() => setIsPlaying(true));
    } else if (isShuffledRef.current && queue.length > 1) {
      // Shuffle : choisir un index aléatoire différent du courant
      setQueueIndex((i) => {
        let randomIdx = i;
        while (randomIdx === i) {
          randomIdx = Math.floor(Math.random() * queue.length);
        }
        return randomIdx;
      });
    } else {
      setQueueIndex((i) => {
        const nextIdx = i + 1;
        if (nextIdx < queue.length) {
          return nextIdx;
        } else if (repeatMode === "all") {
          return 0;
        }
        return i;
      });
    }
  }, [repeatMode, queue.length]);

  // Maintenir la ref synchronisée avec la dernière version de handleEnded
  useEffect(() => {
    handleEndedRef.current = handleEnded;
  }, [handleEnded]);

  // Annule la reprise en attente : l'utilisateur a choisi une autre action
  const cancelPendingResume = useCallback(() => {
    pendingResumeRef.current = false;
    removeGestureListenerRef.current();
  }, []);

  const loadTrack = useCallback((t: PlayerTrack) => {
    const audio = audioRef.current!;
    cancelPendingResume();
    pendingSeekRef.current = null;
    setIsLoading(true);
    setTrack(t);
    setCurrentTime(0);
    setDuration(0);
    audio.src = t.audioUrl;
    audio.load();
    audio.play()
      .then(() => setIsPlaying(true))
      .catch(() => setIsPlaying(false))
      .finally(() => setIsLoading(false));
    playCountedRef.current = null;
  }, [cancelPendingResume]);

  // Maintenir loadTrackRef synchronisée
  useEffect(() => {
    loadTrackRef.current = loadTrack;
  }, [loadTrack]);

  // Load track when queueIndex or queueVersion changes
  useEffect(() => {
    if (skipQueueLoadRef.current) {
      skipQueueLoadRef.current = false;
      return;
    }
    if (queue.length === 0) return;
    const t = queue[queueIndex];
    if (!t) return;
    // queueVersion change force le rechargement même si le track id est le même
    loadTrackRef.current(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queueIndex, queueVersion]);

  // Record play after 30s
  useEffect(() => {
    if (!track || !isPlaying) return;
    if (currentTime > 30 && playCountedRef.current !== track.id) {
      playCountedRef.current = track.id;
      if (track.type === "mix") {
        mixesApi.recordPlay(track.id).catch(() => {});
      }
    }
  }, [currentTime, track, isPlaying]);

  const play = useCallback((t: PlayerTrack, q?: PlayerTrack[]) => {
    const newQueue = q ?? [t];
    const idx = newQueue.findIndex((x) => x.id === t.id);
    setQueue(newQueue);
    setQueueIndex(idx >= 0 ? idx : 0);
    setQueueVersion((v) => v + 1); // force reload même si même track
    loadTrack(t);
  }, [loadTrack]);

  const pause = useCallback(() => {
    cancelPendingResume();
    audioRef.current?.pause();
    setIsPlaying(false);
  }, [cancelPendingResume]);

  const resume = useCallback(() => {
    cancelPendingResume();
    audioRef.current?.play().then(() => setIsPlaying(true));
  }, [cancelPendingResume]);

  const togglePlay = useCallback(() => {
    if (isPlaying) pause(); else resume();
  }, [isPlaying, pause, resume]);

  const seek = useCallback((seconds: number) => {
    if (!audioRef.current) return;
    if (pendingSeekRef.current !== null) pendingSeekRef.current = seconds;
    audioRef.current.currentTime = seconds;
    setCurrentTime(seconds);
  }, []);

  const setVolume = useCallback((v: number) => {
    const clamped = Math.max(0, Math.min(1, v));
    setVolumeState(clamped);
    if (audioRef.current) audioRef.current.volume = clamped;
    if (clamped > 0) setIsMuted(false);
  }, []);

  const toggleMute = useCallback(() => {
    if (!audioRef.current) return;
    const next = !isMuted;
    setIsMuted(next);
    audioRef.current.muted = next;
  }, [isMuted]);

  const next = useCallback(() => {
    if (isShuffledRef.current && queue.length > 1) {
      // Shuffle : index aléatoire différent du courant
      setQueueIndex((i) => {
        let randomIdx = i;
        while (randomIdx === i) {
          randomIdx = Math.floor(Math.random() * queue.length);
        }
        return randomIdx;
      });
    } else {
      const nextIdx = queueIndex + 1;
      if (nextIdx < queue.length) setQueueIndex(nextIdx);
      else if (repeatMode === "all") setQueueIndex(0);
    }
  }, [queueIndex, queue.length, repeatMode]);

  const prev = useCallback(() => {
    if (currentTime > 3) { seek(0); return; }
    const prevIdx = queueIndex - 1;
    if (prevIdx >= 0) setQueueIndex(prevIdx);
  }, [queueIndex, currentTime, seek]);

  const toggleShuffle = useCallback(() => {
    setIsShuffled((s) => {
      isShuffledRef.current = !s;
      return !s;
    });
  }, []);
  const cycleRepeat = useCallback(() => {
    setRepeatMode((r) => r === "none" ? "one" : r === "one" ? "all" : "none");
  }, []);

  const addToQueue = useCallback((t: PlayerTrack) => {
    setQueue((q) => [...q, t]);
  }, []);

  const removeFromQueue = useCallback((index: number) => {
    setQueue((q) => q.filter((_, i) => i !== index));
    setQueueIndex((curr) => {
      if (index < curr) return curr - 1;
      return curr;
    });
  }, []);

  const jumpToQueueIndex = useCallback((index: number) => {
    setQueueIndex(index);
    setQueueVersion((v) => v + 1);
  }, []);

  const clearQueue = useCallback(() => {
    cancelPendingResume();
    setQueue([]);
    setQueueIndex(0);
    audioRef.current?.pause();
    setIsPlaying(false);
    setTrack(null);
    // Clear persisted state when user explicitly closes the player
    if (typeof window !== "undefined") {
      try { window.localStorage.removeItem(PLAYER_STORAGE_KEY); } catch {}
    }
  }, [cancelPendingResume]);

  // ── Media Session API — update on track change ──
  useEffect(() => {
    if (typeof navigator === "undefined" || !("mediaSession" in navigator) || !track) return;
    navigator.mediaSession.metadata = new MediaMetadata({
      title: track.title,
      artist: track.artist.stageName,
      album: "AfroMix",
      artwork: track.coverUrl
        ? [{ src: track.coverUrl, sizes: "512x512", type: "image/jpeg" }]
        : [],
    });
    navigator.mediaSession.setActionHandler("play", () => resume());
    navigator.mediaSession.setActionHandler("pause", () => pause());
    navigator.mediaSession.setActionHandler("nexttrack", () => next());
    navigator.mediaSession.setActionHandler("previoustrack", () => prev());
    navigator.mediaSession.setActionHandler("seekbackward", (d) =>
      seek(Math.max(0, currentTime - (d.seekOffset ?? 10)))
    );
    navigator.mediaSession.setActionHandler("seekforward", (d) =>
      seek(currentTime + (d.seekOffset ?? 10))
    );
  }, [track, currentTime, resume, pause, next, prev, seek]);

  // ── Media Session playbackState — update on play/pause ──
  useEffect(() => {
    if (typeof navigator === "undefined" || !("mediaSession" in navigator)) return;
    navigator.mediaSession.playbackState = isPlaying ? "playing" : "paused";
  }, [isPlaying]);

  // ── localStorage persistence — enregistre titre, file, position et état de lecture ──
  useEffect(() => {
    const persist = () => {
      if (!track) return;
      lastSaveRef.current = Date.now();
      const audio = audioRef.current;
      try {
        window.localStorage.setItem(
          PLAYER_STORAGE_KEY,
          JSON.stringify({
            currentTrackId: track.id,
            queue,
            queueIndex,
            volume,
            isShuffled,
            repeatMode,
            // Tant que la restauration n'est pas terminée, on garde les valeurs d'avant le rechargement
            position: pendingSeekRef.current ?? audio?.currentTime ?? 0,
            wasPlaying: pendingResumeRef.current || isPlaying,
          })
        );
      } catch {}
    };
    persistRef.current = persist;
    persist();
  }, [track, queue, queueIndex, volume, isShuffled, repeatMode, isPlaying]);

  // Dernière sauvegarde au départ de la page (rechargement, fermeture, passage en arrière-plan)
  useEffect(() => {
    const save = () => persistRef.current();
    const onVisibility = () => {
      if (document.visibilityState === "hidden") save();
    };
    window.addEventListener("pagehide", save);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("pagehide", save);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  // ── localStorage persistence — restore once at mount ──
  // NOTE: This effect must run AFTER the audio init effect (order of declaration matters in React).
  // The audio init effect is declared first (above), so this runs after audio is ready.
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    try {
      const raw = window.localStorage.getItem(PLAYER_STORAGE_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw) as {
        currentTrackId?: string;
        queue?: PlayerTrack[];
        queueIndex?: number;
        volume?: number;
        isShuffled?: boolean;
        repeatMode?: "none" | "one" | "all";
        position?: number;
        wasPlaying?: boolean;
      };
      if (!saved.queue?.length || !saved.currentTrackId) return;
      const idx = Math.max(0, Math.min(saved.queueIndex ?? 0, saved.queue.length - 1));
      const t = saved.queue[idx] as PlayerTrack;
      if (!t?.audioUrl) return;

      // Un titre terminé repart du début, sans se relancer seul
      const position = typeof saved.position === "number" && saved.position > 0 ? saved.position : 0;
      const finished = !!t.durationSec && position >= t.durationSec - 3;
      const startAt = finished ? 0 : position;

      // L'état initial de queueIndex vaut 0 : seul un autre index déclenche l'effet de file
      if (idx !== 0) skipQueueLoadRef.current = true;
      pendingSeekRef.current = startAt;
      pendingResumeRef.current = !!saved.wasPlaying && !finished;
      // L'écoute a déjà été comptée avant le rechargement
      if (startAt > 30) playCountedRef.current = t.id;

      // Restauration unique depuis un système externe (localStorage + <audio>) :
      // ces états pilotent aussi l'élément audio, un état initial paresseux ne suffit pas.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setQueue(saved.queue);
      setQueueIndex(idx);
      setTrack(t);
      setCurrentTime(startAt);
      setDuration(t.durationSec ?? 0);
      if (saved.isShuffled) {
        isShuffledRef.current = true;
        setIsShuffled(true);
      }
      if (saved.repeatMode) setRepeatMode(saved.repeatMode);
      const vol = typeof saved.volume === "number" ? saved.volume : 0.8;
      setVolumeState(vol);
      audio.volume = vol;

      const start = () => {
        if (pendingSeekRef.current) audio.currentTime = pendingSeekRef.current;
        pendingSeekRef.current = null;
        if (!pendingResumeRef.current) return;
        audio.play().then(() => {
          pendingResumeRef.current = false;
          setIsPlaying(true);
        }).catch(() => {
          // Lecture automatique bloquée par le navigateur : reprise au premier clic sur la page.
          // « click » et non « pointerdown » : le bouton lecture agit d'abord et annule cette reprise.
          const onClick = () => {
            cancelPendingResume();
            audio.play().then(() => setIsPlaying(true)).catch(() => {});
          };
          document.addEventListener("click", onClick);
          removeGestureListenerRef.current = () => document.removeEventListener("click", onClick);
        });
      };
      audio.addEventListener("loadedmetadata", start, { once: true });
      audio.src = t.audioUrl;
      audio.load();

      return () => {
        audio.removeEventListener("loadedmetadata", start);
        removeGestureListenerRef.current();
      };
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // run once at mount

  return (
    <PlayerContext.Provider value={{
      track, queue, queueIndex, isPlaying, isLoading,
      currentTime, duration, volume, isMuted, isShuffled, repeatMode,
      play, pause, resume, togglePlay, seek, setVolume,
      toggleMute, next, prev, toggleShuffle, cycleRepeat,
      addToQueue, removeFromQueue, jumpToQueueIndex, clearQueue,
    }}>
      {children}
    </PlayerContext.Provider>
  );
}

export function usePlayer() {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error("usePlayer must be used inside PlayerProvider");
  return ctx;
}
