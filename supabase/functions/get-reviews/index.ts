// Klaviyo Reviews proxy
// Fetches 5-star reviews with a written comment from Klaviyo's Reviews API.
// Docs: https://developers.klaviyo.com/en/reference/get_reviews

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const KLAVIYO_API_REVISION = "2025-04-15";
const KLAVIYO_BASE = "https://a.klaviyo.com/api/reviews";

type NormalizedReview = {
  id: string;
  rating: number;
  title: string | null;
  content: string;
  authorName: string;
  authorEmail: string | null;
  productName: string | null;
  createdAt: string | null;
  verified: boolean;
};

type KlaviyoReviewAttrs = {
  rating?: number;
  title?: string | null;
  content?: string | null;
  author?: string | null;
  email?: string | null;
  product?: { name?: string | null } | null;
  created?: string | null;
  verified?: boolean | null;
  status?: string | null;
  public?: boolean | null;
};

type KlaviyoReview = {
  id: string;
  attributes: KlaviyoReviewAttrs;
};

type KlaviyoListResponse = {
  data?: KlaviyoReview[];
  links?: { next?: string | null };
};

function normalize(r: KlaviyoReview): NormalizedReview | null {
  const a = r.attributes ?? {};
  const content = (a.content ?? "").trim();
  if (!content) return null;
  if ((a.rating ?? 0) < 5) return null;

  // Only show publicly visible / published reviews
  if (a.public === false) return null;
  if (a.status && a.status.toLowerCase() !== "published") return null;

  return {
    id: r.id,
    rating: a.rating ?? 5,
    title: a.title ?? null,
    content,
    authorName: a.author ?? "Verified stylist",
    authorEmail: a.email ?? null,
    productName: a.product?.name ?? null,
    createdAt: a.created ?? null,
    verified: !!a.verified,
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get("KLAVIYO_PRIVATE_API_KEY");
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "KLAVIYO_PRIVATE_API_KEY is not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const url = new URL(req.url);
    const limit = Math.min(Number(url.searchParams.get("limit") ?? "20"), 100);

    // Diagnostic: ?probe=1 returns the raw status of /accounts and /reviews
    // so we can tell whether the key is invalid vs missing the Reviews scope.
    if (url.searchParams.get("probe") === "1") {
      const probe = async (path: string) => {
        const r = await fetch(`https://a.klaviyo.com/api/${path}`, {
          headers: {
            Authorization: `Klaviyo-API-Key ${apiKey}`,
            accept: "application/vnd.api+json",
            revision: KLAVIYO_API_REVISION,
          },
        });
        const text = await r.text();
        return { status: r.status, body: text.slice(0, 600) };
      };
      const [accounts, reviews] = await Promise.all([
        probe("accounts/"),
        probe("reviews/?page[size]=1"),
      ]);
      return new Response(
        JSON.stringify({ revision: KLAVIYO_API_REVISION, accounts, reviews }, null, 2),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Server-side filter: rating == 5. Klaviyo's filter grammar uses equals(),
    // greater-or-equal() on `rating` is not supported and returns 500.
    // Sort newest first.
    // NOTE: Klaviyo's Reviews API returns a generic 500 when given certain
    // filter combinations (e.g. equals(rating,5)). We sort newest-first and
    // filter rating/published/content client-side in normalize() instead.
    const params = new URLSearchParams();
    params.set("sort", "-created");
    params.set("page[size]", String(Math.min(Math.max(limit * 4, 20), 100)));

    const klaviyoUrl = `${KLAVIYO_BASE}?${params.toString()}`;

    const res = await fetch(klaviyoUrl, {
      headers: {
        Authorization: `Klaviyo-API-Key ${apiKey}`,
        accept: "application/vnd.api+json",
        revision: KLAVIYO_API_REVISION,
      },
    });

    const body = (await res.json()) as KlaviyoListResponse | { errors?: unknown };

    if (!res.ok) {
      console.error("Klaviyo Reviews API error", res.status, body);
      // Degrade gracefully: return empty list so client falls back to static
      // testimonials instead of surfacing a 500 to the UI.
      return new Response(
        JSON.stringify({ reviews: [], count: 0, fallback: true, upstreamStatus: res.status }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const list = (body as KlaviyoListResponse).data ?? [];
    const normalized = list
      .map(normalize)
      .filter((r): r is NormalizedReview => r !== null)
      .slice(0, limit);

    return new Response(
      JSON.stringify({
        reviews: normalized,
        count: normalized.length,
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
          // Cache at the CDN edge for 5 minutes; stylist reviews don't change often
          "Cache-Control": "public, max-age=60, s-maxage=300, stale-while-revalidate=600",
        },
      }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("get-reviews fatal error", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
