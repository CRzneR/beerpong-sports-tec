import { Fragment, type ReactNode } from "react";
import { Check } from "lucide-react";

/*
|--------------------------------------------------------------------------
| MARKDOWN FÜR NEWS-BEITRÄGE
|--------------------------------------------------------------------------
|
| Datei: lib/markdown.tsx
|
| Kleiner, abhängigkeitsfreier Markdown-Renderer (gibt React-Elemente aus,
| kein HTML-String - es kann also nichts eingeschleust werden).
|
| Unterstützt:
|   ## Überschrift / ### Unterüberschrift   (ein einzelnes # wird wie ## behandelt)
|   Absätze, **fett**, *kursiv*, `Code`
|   [Link](https://…) oder [Link](/pfad)
|   ![Bildbeschreibung](/images/news/bild.webp)
|   - Aufzählung, 1. nummerierte Liste
|   > Zitat
|   --- (Trennlinie)
|
*/

const SAFE_URL = /^(https?:\/\/|\/|#|mailto:)/i;

function safeUrl(url: string): string | null {
  const trimmed = url.trim();

  return SAFE_URL.test(trimmed) ? trimmed : null;
}

const INLINE =
  /(\*\*[^*]+\*\*|\*[^*\s][^*]*\*|`[^`]+`|!\[[^\]]*\]\([^)\s]+\)|\[[^\]]+\]\([^)\s]+\))/g;

function renderInline(text: string, keyPrefix = "i"): ReactNode[] {
  const nodes: ReactNode[] = [];
  let last = 0;
  let index = 0;

  for (const match of text.matchAll(INLINE)) {
    const token = match[0];
    const start = match.index ?? 0;

    if (start > last) nodes.push(text.slice(last, start));

    const key = `${keyPrefix}-${index++}`;

    if (token.startsWith("**")) {
      nodes.push(
        <strong key={key} className="font-bold text-white">
          {renderInline(token.slice(2, -2), key)}
        </strong>,
      );
    } else if (token.startsWith("`")) {
      nodes.push(
        <code key={key} className="rounded bg-white/10 px-1.5 py-0.5 text-[0.9em] text-emerald-300">
          {token.slice(1, -1)}
        </code>,
      );
    } else if (token.startsWith("![")) {
      const parts = token.match(/^!\[([^\]]*)\]\(([^)\s]+)\)$/);
      const src = parts ? safeUrl(parts[2]) : null;

      if (parts && src) {
        // eslint-disable-next-line @next/next/no-img-element
        nodes.push(<img key={key} src={src} alt={parts[1]} loading="lazy" className="my-6 h-auto w-full rounded-2xl border border-white/10" />);
      }
    } else if (token.startsWith("[")) {
      const parts = token.match(/^\[([^\]]+)\]\(([^)\s]+)\)$/);
      const href = parts ? safeUrl(parts[2]) : null;

      if (parts && href) {
        const external = /^https?:\/\//i.test(href);

        nodes.push(
          <a
            key={key}
            href={href}
            {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
            className="font-medium text-emerald-400 underline decoration-emerald-400/40 underline-offset-4 transition hover:decoration-emerald-400"
          >
            {renderInline(parts[1], key)}
          </a>,
        );
      } else if (parts) {
        nodes.push(parts[1]);
      }
    } else {
      nodes.push(
        <em key={key} className="italic text-white/80">
          {renderInline(token.slice(1, -1), key)}
        </em>,
      );
    }

    last = start + token.length;
  }

  if (last < text.length) nodes.push(text.slice(last));

  return nodes;
}

type Block =
  | { type: "heading"; level: 2 | 3; text: string }
  | { type: "paragraph"; text: string }
  | { type: "list"; ordered: boolean; items: string[] }
  | { type: "quote"; text: string }
  | { type: "image"; alt: string; src: string }
  | { type: "code"; text: string }
  | { type: "rule" };

function parseBlocks(source: string): Block[] {
  const lines = source.replace(/\r\n/g, "\n").split("\n");
  const blocks: Block[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) {
      i++;
      continue;
    }

    if (trimmed.startsWith("```")) {
      const code: string[] = [];

      i++;

      while (i < lines.length && !lines[i].trim().startsWith("```")) {
        code.push(lines[i]);
        i++;
      }

      i++;
      blocks.push({ type: "code", text: code.join("\n") });
      continue;
    }

    const heading = trimmed.match(/^(#{1,6})\s+(.+)$/);

    if (heading) {
      blocks.push({ type: "heading", level: heading[1].length <= 2 ? 2 : 3, text: heading[2] });
      i++;
      continue;
    }

    if (/^(-{3,}|\*{3,})$/.test(trimmed)) {
      blocks.push({ type: "rule" });
      i++;
      continue;
    }

    const image = trimmed.match(/^!\[([^\]]*)\]\(([^)\s]+)\)$/);

    if (image) {
      blocks.push({ type: "image", alt: image[1], src: image[2] });
      i++;
      continue;
    }

    if (trimmed.startsWith(">")) {
      const quote: string[] = [];

      while (i < lines.length && lines[i].trim().startsWith(">")) {
        quote.push(lines[i].trim().replace(/^>\s?/, ""));
        i++;
      }

      blocks.push({ type: "quote", text: quote.join(" ") });
      continue;
    }

    const bullet = /^[-*]\s+/;
    const numbered = /^\d+[.)]\s+/;

    if (bullet.test(trimmed) || numbered.test(trimmed)) {
      const ordered = numbered.test(trimmed);
      const pattern = ordered ? numbered : bullet;
      const items: string[] = [];

      while (i < lines.length && pattern.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(pattern, ""));
        i++;
      }

      blocks.push({ type: "list", ordered, items });
      continue;
    }

    const paragraph: string[] = [];

    while (
      i < lines.length &&
      lines[i].trim() &&
      !/^(#{1,6}\s|>|[-*]\s|\d+[.)]\s|```|!\[)/.test(lines[i].trim())
    ) {
      paragraph.push(lines[i].trim());
      i++;
    }

    if (paragraph.length === 0) {
      // Sicherheitsnetz gegen Endlosschleifen bei unerwarteten Zeilen
      paragraph.push(lines[i].trim());
      i++;
    }

    blocks.push({ type: "paragraph", text: paragraph.join(" ") });
  }

  return blocks;
}

export function Markdown({ source }: { source: string }) {
  const blocks = parseBlocks(source);

  return (
    <div className="space-y-5 text-base leading-relaxed text-white/60 md:text-[17px]">
      {blocks.map((block, index) => {
        const key = `b-${index}`;

        switch (block.type) {
          case "heading":
            return block.level === 2 ? (
              <h2
                key={key}
                className="pt-6 text-2xl font-black uppercase leading-tight tracking-[-0.03em] text-white md:text-3xl"
              >
                {renderInline(block.text, key)}
              </h2>
            ) : (
              <h3 key={key} className="pt-3 text-lg font-black uppercase tracking-wide text-white">
                {renderInline(block.text, key)}
              </h3>
            );

          case "paragraph":
            return <p key={key}>{renderInline(block.text, key)}</p>;

          case "list":
            return block.ordered ? (
              <ol key={key} className="space-y-3">
                {block.items.map((item, n) => (
                  <li key={`${key}-${n}`} className="flex gap-3.5">
                    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-emerald-400 text-xs font-black text-black">
                      {n + 1}
                    </span>

                    <span>{renderInline(item, `${key}-${n}`)}</span>
                  </li>
                ))}
              </ol>
            ) : (
              <ul key={key} className="space-y-3">
                {block.items.map((item, n) => (
                  <li key={`${key}-${n}`} className="flex gap-3.5">
                    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-400 text-black">
                      <Check className="h-3.5 w-3.5" strokeWidth={3.5} />
                    </span>

                    <span>{renderInline(item, `${key}-${n}`)}</span>
                  </li>
                ))}
              </ul>
            );

          case "quote":
            return (
              <blockquote
                key={key}
                className="rounded-r-2xl border-l-2 border-emerald-400 bg-emerald-400/[0.05] px-5 py-4 text-white/75"
              >
                {renderInline(block.text, key)}
              </blockquote>
            );

          case "image": {
            const src = safeUrl(block.src);

            return src ? (
              <figure key={key} className="py-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt={block.alt} loading="lazy" className="h-auto w-full rounded-2xl border border-white/10" />

                {block.alt ? (
                  <figcaption className="mt-2 text-center text-xs text-white/35">{block.alt}</figcaption>
                ) : null}
              </figure>
            ) : (
              <Fragment key={key} />
            );
          }

          case "code":
            return (
              <pre key={key} className="overflow-x-auto rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm text-emerald-200">
                <code>{block.text}</code>
              </pre>
            );

          case "rule":
            return <hr key={key} className="border-white/10" />;
        }
      })}
    </div>
  );
}
