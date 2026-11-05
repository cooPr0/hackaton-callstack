import { Citation } from "@tint/protocol";

const DAY_MS = 86_400_000;
const iso = (t: number) => new Date(t).toISOString().slice(0, 10);

/** X search window: the last 7 days (UTC), `to_date` tomorrow so today's posts are included. */
export const searchWindow = (now: number) => ({
  from_date: iso(now - 7 * DAY_MS),
  to_date: iso(now + DAY_MS),
});

const statusId = (url: string) => url.match(/\/status\/(\d{1,25})/)?.[1];

/**
 * Citations the model claims, kept only when (a) they are x.com / twitter.com post links
 * (protocol `Citation`), and (b) the post really came back from the search: xAI lists the fetched
 * posts as `url_citation` annotations, so an invented post id is dropped. Max 2, no duplicates.
 */
export function verifiedCitations(claimed: unknown, annotationUrls: string[]): Citation[] {
  const real = new Set(annotationUrls.map(statusId).filter(Boolean));
  const out: Citation[] = [];
  for (const c of Array.isArray(claimed) ? claimed : []) {
    const parsed = Citation.safeParse(c);
    if (!parsed.success) continue;
    const id = statusId(parsed.data.url);
    if (!id || !real.has(id) || out.some((o) => statusId(o.url) === id)) continue;
    out.push(parsed.data);
    if (out.length === 2) break;
  }
  return out;
}

/** xAI inlines `<grok type="render_inline_citation" …/>` markers into text; players must not see them. */
export const stripRenderTags = (s: string) =>
  s
    .replace(/<grok\b[^>]*\/>/g, "")
    .replace(/<grok\b[^>]*>[\s\S]*?<\/grok>/g, "")
    .replace(/\s+/g, " ")
    .trim();
