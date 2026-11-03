import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Meine Statistiken",
  description:
    "Dein persönliches Dashboard bei Pong Stats: Spielstatistiken, Matchverlauf und Ranglisten.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function SpielerLayout({ children }: { children: React.ReactNode }) {
  return children;
}
