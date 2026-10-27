import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Anmelden",
  description:
    "Melde dich bei Pong Stats an oder registriere dich, um deine Beer-Pong-Statistiken zu speichern.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
