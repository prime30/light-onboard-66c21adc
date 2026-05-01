import { ArrowLeft, Star, Quote, ArrowUpRight, Loader2 } from "lucide-react";
import { Link, useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useReviews, type Review } from "@/hooks/use-reviews";

/** Pick the most "real" image we have for a review. */
function reviewImage(r: Review): string | null {
  return r.images[0] ?? r.productImage ?? null;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return (parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "");
}

/** Avatar slot — customer photo > product image > initials placeholder. */
const ReviewAvatar = ({
  review,
  className,
}: {
  review: Review;
  className?: string;
}) => {
  const src = reviewImage(review);
  if (src) {
    return (
      <img
        src={src}
        alt={review.productName ?? review.authorName}
        loading="lazy"
        className={cn("rounded-full object-cover bg-muted", className)}
      />
    );
  }
  return (
    <div
      className={cn(
        "rounded-full bg-muted text-foreground/70 flex items-center justify-center text-xs font-medium uppercase",
        className
      )}
      aria-hidden="true"
    >
      {initials(review.authorName)}
    </div>
  );
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
            <div className="flex items-center gap-3">
              <ReviewAvatar review={featured} className="w-10 h-10" />
              <div>
                <h3 className="font-semibold text-sm">{featured.authorName}</h3>
                <p className="text-muted-foreground text-xs">
                  {featured.productName ? `Verified · ${featured.productName}` : "Verified stylist"}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Product images from real reviews */}
        {(() => {
          const productImages = Array.from(
            new Set(
              (reviews ?? [])
                .map((r) => r.productImage)
                .filter((src): src is string => !!src)
            )
          ).slice(0, 5);
          if (productImages.length === 0) return null;
          return (
            <div className="flex items-center gap-3 mb-8 pb-8 border-b border-border">
              <div className="flex -space-x-2">
                {productImages.map((src, i) => (
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
          );
        })()}

        {/* Review grid */}
        <div className="space-y-4">
          {rest.map((review, index) => (
            <div
              key={review.id}
              className="group border border-border rounded-xl p-5 transition-all duration-200 hover:border-foreground/20 animate-fade-in"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="flex items-start gap-4">
                <ReviewAvatar review={review} className="w-10 h-10 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <div>
                      <h3 className="font-semibold text-sm">{review.authorName}</h3>
                      <p className="text-xs text-muted-foreground">
                        {review.productName
                          ? `Verified · ${review.productName}`
                          : "Verified stylist"}
                      </p>
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
                </div>
              </div>
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
