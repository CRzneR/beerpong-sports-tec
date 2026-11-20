import type { MetadataRoute } from "next";

/*
 * --------------------------------------------------------------------------
 * | WEB-APP-MANIFEST  (wird automatisch unter /manifest.webmanifest ausgeliefert)
 * --------------------------------------------------------------------------
 *
 * Datei: app/manifest.ts
 *
 * Name, Farben und Icons, wenn die Seite auf dem Handy zum Startbildschirm
 * hinzugefügt wird, außerdem von Browsern und Suchmaschinen gelesen.
 * Die Icons liegen in public/images/icons/.
 * --------------------------------------------------------------------------
 */

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "BeerPong Sports Tec",
    short_name: "BeerPong ST",
    description:
      "Beer-Pong-Matches live erfassen, Statistiken verfolgen und Turniere organisieren: Pong Stats und Pong League.",
    start_url: "/",
    display: "standalone",
    background_color: "#07090d",
    theme_color: "#07090d",
    lang: "de",
    icons: [
      { src: "/images/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/images/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
