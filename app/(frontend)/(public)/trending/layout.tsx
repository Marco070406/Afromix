import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Tendances",
  description: "Les mixes et DJs les plus écoutés du moment sur AfroMix.",
};

export default function TrendingLayout({ children }: { children: React.ReactNode }) {
  return children;
}
