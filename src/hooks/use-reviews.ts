import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import stylistPink1 from "@/assets/avatars/stylist-pink-1.jpg";
import stylistPurple1 from "@/assets/avatars/stylist-purple-1.jpg";
import stylistBlue1 from "@/assets/avatars/stylist-blue-1.jpg";
import stylistOmbre1 from "@/assets/avatars/stylist-ombre-1.jpg";
import stylistTeal1 from "@/assets/avatars/stylist-teal-1.jpg";
import stylistLavender1 from "@/assets/avatars/stylist-lavender-1.jpg";
import stylistMagenta1 from "@/assets/avatars/stylist-magenta-1.jpg";
import stylistElectric1 from "@/assets/avatars/stylist-electric-1.jpg";

export type Review = {
  id: string;
  rating: number;
  title: string | null;
  content: string;
  authorName: string;
  productName: string | null;
  createdAt: string | null;
  verified: boolean;
  /** Stylist avatar deterministically picked from the author name. */
  avatar: string;
};

const AVATARS = [
  stylistPink1,
  stylistPurple1,
  stylistBlue1,
  stylistOmbre1,
  stylistTeal1,
  stylistLavender1,
  stylistMagenta1,
  stylistElectric1,
];

function pickAvatar(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return AVATARS[hash % AVATARS.length];
}

/** Convert "Sarah Mitchell" -> "Sarah M." for privacy. */
function maskName(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[parts.length - 1].charAt(0).toUpperCase()}.`;
}

type EdgeResponse = {
  reviews: Array<Omit<Review, "avatar"> & { avatar?: string }>;
};

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
      return list.map((r) => {
        const masked = maskName(r.authorName);
        return {
          ...r,
          authorName: masked,
          avatar: pickAvatar(r.id || masked),
        };
      });
    },
  });
}
