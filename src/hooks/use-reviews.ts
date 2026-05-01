import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type Review = {
  id: string;
  rating: number;
  title: string | null;
  content: string;
  authorName: string;
  productName: string | null;
  productUrl: string | null;
  /** Shopify product image (full URL). */
  productImage: string | null;
  /** Customer-uploaded review photos (full URLs). */
  images: string[];
  createdAt: string | null;
  verified: boolean;
};

/** Convert "Sarah Mitchell" -> "Sarah M." for privacy. */
function maskName(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[parts.length - 1].charAt(0).toUpperCase()}.`;
}

type EdgeReview = Omit<Review, "authorName"> & { authorName: string };
type EdgeResponse = { reviews: EdgeReview[] };

export function useReviews(limit = 20) {
  return useQuery<Review[]>({
    queryKey: ["klaviyo-reviews", limit],
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    retry: 1,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke<EdgeResponse>("get-reviews", {
        body: { limit },
      });

      if (error) throw error;
      const list = data?.reviews ?? [];
      return list.map((r) => ({
        ...r,
        authorName: maskName(r.authorName),
        images: Array.isArray(r.images) ? r.images : [],
      }));
    },
  });
}
