import type { Metadata } from "next";
import { HomepageClient } from "./components/homepage/homepage-client";

export const metadata: Metadata = {
  title: "AfroMix — Streaming musical africain",
  description: "Découvrez les meilleurs mixes Afrobeats, Amapiano, Afro House et plus encore.",
};

export default function HomePage() {
  return <HomepageClient />;
}