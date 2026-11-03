import { createNavigation } from "next-intl/navigation";

import { routing } from "./routing";

/*
 * Statt "next/link" und "next/navigation" ab jetzt DIESE Exporte nutzen:
 *
 *   import { Link, useRouter, usePathname, redirect } from "@/i18n/navigation";
 *
 * Sie setzen die richtige Sprache und die übersetzte Adresse automatisch
 * (<Link href="/spieler"> wird auf Englisch zu /en/pong-stats).
 * useParams, useSearchParams und notFound bleiben in "next/navigation".
 */
export const { Link, redirect, usePathname, useRouter, getPathname } = createNavigation(routing);
