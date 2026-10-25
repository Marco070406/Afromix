"use client";

import { Play, Pause, Loader2 } from "lucide-react";
import { cn } from "@/app/(frontend)/lib/utils";

interface PlayButtonProps {
  isPlaying?: boolean;
  isLoading?: boolean;
  size?: "sm" | "md" | "lg";
  onClick?: () => void;
  className?: string;
  "aria-label"?: string;
}

const sizeClasses = {
  sm: "h-8 w-8",
  md: "h-11 w-11",
  lg: "h-14 w-14",
};

const iconClasses = {
  sm: "h-3.5 w-3.5",
  md: "h-5 w-5",
  lg: "h-6 w-6",
};

export function PlayButton({
  isPlaying = false,
  isLoading = false,
  size = "md",
  onClick,
  className,
  "aria-label": ariaLabel,
}: PlayButtonProps) {
  return (
    <button
      onClick={onClick}
      aria-label={ariaLabel ?? (isPlaying ? "Mettre en pause" : "Lire")}
      className={cn(
        "rounded-full flex items-center justify-center",
        "bg-white text-black hover:scale-105 active:scale-95",
        "transition-transform duration-150 shadow-lg shadow-black/30",
        "focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-transparent",
        sizeClasses[size],
        className
      )}
    >
      {isLoading ? (
        <Loader2 className={cn(iconClasses[size], "animate-spin")} />
      ) : isPlaying ? (
        <Pause className={cn(iconClasses[size])} />
      ) : (
        <Play className={cn(iconClasses[size], "ml-0.5")} />
      )}
    </button>
  );
}
