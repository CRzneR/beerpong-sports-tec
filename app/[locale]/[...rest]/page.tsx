import { notFound } from "next/navigation";

/*
 * Fängt alle unbekannten Adressen ab und löst die 404-Seite INNERHALB des
 * Sprach-Layouts aus (sonst bekäme sie weder <html lang> noch Übersetzungen).
 */
export default function CatchAllPage() {
  notFound();
}
