import type { LucideIcon } from "lucide-react";
import {
  Drum,
  Piano,
  Volume2,
  Heart,
  Palmtree,
  Flame,
  Music,
  Sparkles,
  Zap,
  Activity,
  Guitar,
  PartyPopper,
  Disc3,
} from "lucide-react";

export interface GenreItem {
  id: string;
  name: string;
  icon: LucideIcon;
}

export const GENRE_ICONS: Record<string, LucideIcon> = {
  AFROBEATS: Drum,
  AMAPIANO: Piano,
  AFRO_HOUSE: Volume2,
  AFRO_SOUL: Heart,
  BONGO_FLAVA: Palmtree,
  DANCEHALL: Flame,
  HIGHLIFE: Music,
  KIZOMBA: Sparkles,
  KUDURO: Zap,
  NDOMBOLO: Activity,
  RUMBA: Guitar,
  SOCA: PartyPopper,
};

export const GENRES_WITH_ICONS: GenreItem[] = [
  { id: "AFROBEATS", name: "Afrobeats", icon: Drum },
  { id: "AMAPIANO", name: "Amapiano", icon: Piano },
  { id: "AFRO_HOUSE", name: "Afro House", icon: Volume2 },
  { id: "AFRO_SOUL", name: "Afro Soul", icon: Heart },
  { id: "BONGO_FLAVA", name: "Bongo Flava", icon: Palmtree },
  { id: "DANCEHALL", name: "Dancehall", icon: Flame },
  { id: "HIGHLIFE", name: "Highlife", icon: Music },
  { id: "KIZOMBA", name: "Kizomba", icon: Sparkles },
  { id: "KUDURO", name: "Kuduro", icon: Zap },
  { id: "NDOMBOLO", name: "Ndombolo", icon: Activity },
  { id: "RUMBA", name: "Rumba", icon: Guitar },
  { id: "SOCA", name: "Soca", icon: PartyPopper },
];

export function getGenreIcon(genreId: string): LucideIcon {
  return GENRE_ICONS[genreId] || Disc3;
}
