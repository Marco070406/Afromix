"use client";

import { Toaster } from "sonner";
import { QueryProvider } from "./query-provider";
import { AuthProvider } from "./auth-provider";
import { PlayerProvider } from "./player-provider";
import { I18nProvider } from "./i18n-provider";

import { PlaylistModalProvider } from "./playlist-modal-provider";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryProvider>
      <AuthProvider>
        <I18nProvider>
          <PlayerProvider>
            <PlaylistModalProvider>
              {children}
            </PlaylistModalProvider>
            <Toaster
              theme="dark"
              position="bottom-right"
              toastOptions={{
                style: {
                  background: "#111318",
                  border: "1px solid rgba(255,255,255,0.08)",
                  color: "#F5F5F5",
                },
              }}
            />
          </PlayerProvider>
        </I18nProvider>
      </AuthProvider>
    </QueryProvider>
  );
}
