import Image from "next/image";
import { ArrowRight } from "lucide-react";

import { Link } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";
import { formatNewsDate, type NewsPost } from "@/lib/news";

/*
 * Karte für einen News-Beitrag (Startseite und /news).
 * Hat der Beitrag im Kopf "page: /pfad", führt die Karte auf diese eigene Seite,
 * sonst auf /news/<slug>.
 */

type LinkHref = React.ComponentProps<typeof Link>["href"];

export function NewsCard({
  post,
  locale,
  readMore,
}: {
  post: NewsPost;
  locale: Locale;
  readMore: string;
}) {
  const href = (
    post.page && post.page in routing.pathnames
      ? post.page
      : { pathname: "/news/[slug]", params: { slug: post.slug } }
  ) as LinkHref;

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-3xl border border-white/10 bg-white/[0.02] transition duration-300 hover:-translate-y-1 hover:border-emerald-400/35">
      <div className="relative aspect-[16/10] overflow-hidden bg-[#0a1210]">
        {post.image ? (
          <Image
            src={post.image}
            alt={post.imageAlt ?? ""}
            fill
            sizes="(min-width: 1024px) 380px, (min-width: 768px) 50vw, 100vw"
            className="object-cover transition duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-400/15 to-transparent" />
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-[#050708]/70 via-transparent to-transparent" />

        {post.category ? (
          <span className="absolute left-4 top-4 rounded-full bg-emerald-400 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-black">
            {post.category}
          </span>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col p-5 md:p-6">
        <time dateTime={post.date} className="text-xs text-white/40">
          {formatNewsDate(post.date, locale)}
        </time>

        <h3 className="mt-2 text-lg font-black uppercase leading-tight tracking-[-0.02em] text-white">
          <Link href={href} className="after:absolute after:inset-0 after:content-['']">
            {post.title}
          </Link>
        </h3>

        {post.excerpt ? (
          <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-white/50">{post.excerpt}</p>
        ) : null}

        <div className="mt-5 inline-flex items-center gap-2 pt-1 text-xs font-bold uppercase tracking-wider text-emerald-400">
          {readMore}

          <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
        </div>
      </div>
    </article>
  );
}
