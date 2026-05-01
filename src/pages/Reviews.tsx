import { ArrowLeft, Star, Quote, ArrowUpRight, Loader2 } from "lucide-react";
import { Link, useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useReviews, type Review } from "@/hooks/use-reviews";
import stylistPink1 from "@/assets/avatars/stylist-pink-1.jpg";
import stylistPurple1 from "@/assets/avatars/stylist-purple-1.jpg";
import stylistBlue1 from "@/assets/avatars/stylist-blue-1.jpg";
import stylistOmbre1 from "@/assets/avatars/stylist-ombre-1.jpg";
import stylistTeal1 from "@/assets/avatars/stylist-teal-1.jpg";

const SOCIAL_PROOF_AVATARS = [
  stylistOmbre1,
  stylistPink1,
  stylistTeal1,
  stylistPurple1,
  stylistBlue1,
];

/** Small 2-col product chip: image + product name. Shown under review text. */
const ProductChip = ({ review }: { review: Review }) => {
  const src = review.productImage ?? review.images[0] ?? null;
  const name = review.productName;
  if (!src && !name) return null;

  const content = (
    <div className="inline-flex items-center gap-2.5 rounded-[10px] border border-border bg-muted/40 pl-1.5 pr-3 py-1.5 transition-colors hover:bg-muted/70">
      {src ? (
        <img
          src={src}
          alt={name ?? ""}
          loading="lazy"
          className="w-9 h-9 rounded-[7px] object-cover bg-muted shrink-0"
        />
      ) : (
        <div className="w-9 h-9 rounded-[7px] bg-muted shrink-0" aria-hidden />
      )}
      {name && (
        <span className="text-xs font-medium text-foreground/80 leading-tight max-w-[180px] truncate">
          {name}
        </span>
      )}
    </div>
  );

  if (review.productUrl) {
    return (
      <a href={review.productUrl} target="_blank" rel="noopener noreferrer" className="inline-block">
        {content}
      </a>
    );
  }
  return content;
};


const Reviews = () => {
  const navigate = useNavigate();
  const { data: reviews, isLoading, isError } = useReviews(40);

  const featured = reviews?.[0];
  const rest = reviews?.slice(1) ?? [];

  return (
    <div className="w-full mx-auto max-w-5xl sm:w-[95vw] lg:w-[90vw] bg-background overflow-hidden animate-[pageSlideUp_0.5s_cubic-bezier(0.16,1,0.3,1)_forwards] flex flex-col">
      <div className="flex-1 overflow-y-auto px-5 sm:px-8 lg:px-12 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-10">
          <Button variant="ghost" size="sm" className="gap-2 -ml-2" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>

          <div className="flex items-center gap-1">
            {[...Array(5)].map((_, i) => (
              <Star key={i} className="h-4 w-4 fill-foreground text-foreground" />
            ))}
            <span className="ml-2 text-sm font-medium">4.9</span>
          </div>
        </div>

        {/* Title */}
        <div className="mb-10">
          <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
            Verified reviews
          </p>
          <h1 className="font-termina text-2xl md:text-3xl font-medium uppercase tracking-[-0.006em] mb-3">
            Loved by Stylists
          </h1>
          <p className="text-muted-foreground max-w-md">
            See what professionals across the country are saying.
          </p>
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">Loading reviews…</span>
          </div>
        )}

        {/* Error */}
        {isError && (
          <div className="text-center py-12 border border-border rounded-xl">
            <p className="text-muted-foreground">
              We couldn't load reviews right now. Please try again shortly.
            </p>
          </div>
        )}

        {/* Featured review */}
        {featured && (
          <div className="bg-gradient-to-r from-muted/50 to-transparent border border-border/50 rounded-xl p-6 md:p-8 mb-8">
            <div className="flex items-start gap-4 mb-4">
              <div className="relative w-12 h-12 rounded-xl bg-foreground flex items-center justify-center flex-shrink-0">
                <Quote className="w-5 h-5 text-background" />
              </div>
              <div className="flex items-center gap-0.5 pt-3">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-foreground text-foreground" />
                ))}
              </div>
            </div>
            <p className="text-base md:text-lg font-medium leading-relaxed mb-6 text-foreground">
              "{featured.content}"
            </p>
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-sm">{featured.authorName}</h3>
                <p className="text-muted-foreground text-xs">Verified stylist</p>
              </div>
              <ProductChip review={featured} />
            </div>
          </div>
        )}

        {/* Social proof — fake stylist avatars */}
        <div className="flex items-center gap-3 mb-8 pb-8 border-b border-border">
          <div className="flex -space-x-2">
            {SOCIAL_PROOF_AVATARS.map((src, i) => (
              <img
                key={i}
                src={src}
                alt=""
                loading="lazy"
                className="w-8 h-8 rounded-full border-2 border-background object-cover bg-muted"
              />
            ))}
          </div>
          <span className="text-sm text-muted-foreground">Join 8,000+ stylists</span>
        </div>

        {/* Review grid */}
        <div className="space-y-4">
          {rest.map((review, index) => (
            <div
              key={review.id}
              className="group border border-border rounded-xl p-5 transition-all duration-200 hover:border-foreground/20 animate-fade-in"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="flex items-start justify-between gap-4 mb-2">
                <div>
                  <h3 className="font-semibold text-sm">{review.authorName}</h3>
                  <p className="text-xs text-muted-foreground">Verified stylist</p>
                </div>
                <div className="flex gap-0.5 shrink-0">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={cn(
                        "h-3 w-3",
                        i < review.rating ? "fill-foreground text-foreground" : "text-muted"
                      )}
                    />
                  ))}
                </div>
              </div>
              {review.title && (
                <p className="text-sm font-medium text-foreground mb-1">{review.title}</p>
              )}
              <p className="text-sm text-foreground/80 leading-relaxed">{review.content}</p>
              {review.images.filter(Boolean).length > 0 && (
                <div className="mt-3 flex gap-2 flex-wrap">
                  {review.images.filter(Boolean).slice(0, 4).map((src, i) => (
                    <img
                      key={i}
                      src={src}
                      alt=""
                      loading="lazy"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).style.display = "none";
                      }}
                      className="w-16 h-16 rounded-lg object-cover bg-muted"
                    />
                  ))}
                </div>
              )}
              {(review.productImage || review.productName) && (
                <div className="mt-4">
                  <ProductChip review={review} />
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Empty state */}
        {!isLoading && !isError && reviews && reviews.length === 0 && (
          <div className="text-center py-12 border border-border rounded-xl">
            <p className="text-muted-foreground">No reviews to show yet.</p>
          </div>
        )}

        {/* CTA */}
        <div className="mt-12 pt-8 border-t border-border">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium mb-1">Ready to get started?</p>
              <p className="text-sm text-muted-foreground">Join thousands of happy stylists.</p>
            </div>
            <Link to="/auth?step=1">
              <Button className="gap-2 rounded-full">
                Apply Now
                <ArrowUpRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Reviews;
