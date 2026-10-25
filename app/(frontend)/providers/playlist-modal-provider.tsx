"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import {
  AddToPlaylistModal,
  type PlaylistItemTarget,
} from "@/app/(frontend)/components/playlists/add-to-playlist-modal";

interface PlaylistModalContextValue {
  openAddToPlaylist: (target: PlaylistItemTarget) => void;
  closeAddToPlaylist: () => void;
}

const PlaylistModalContext = createContext<PlaylistModalContextValue | undefined>(
  undefined
);

export function PlaylistModalProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [target, setTarget] = useState<PlaylistItemTarget | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const openAddToPlaylist = useCallback((item: PlaylistItemTarget) => {
    setTarget(item);
    setIsOpen(true);
  }, []);

  const closeAddToPlaylist = useCallback(() => {
    setIsOpen(false);
  }, []);

  return (
    <PlaylistModalContext.Provider
      value={{ openAddToPlaylist, closeAddToPlaylist }}
    >
      {children}
      <AddToPlaylistModal
        isOpen={isOpen}
        onClose={closeAddToPlaylist}
        target={target}
      />
    </PlaylistModalContext.Provider>
  );
}

export function useAddToPlaylist() {
  const ctx = useContext(PlaylistModalContext);
  if (!ctx) {
    throw new Error("useAddToPlaylist must be used within a PlaylistModalProvider");
  }
  return ctx;
}
