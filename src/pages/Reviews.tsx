import { useState } from "react";
import { ArrowLeft, Star, Quote, ArrowUpRight, Check } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import stylistPink1 from "@/assets/avatars/stylist-pink-1.jpg";
import stylistPurple1 from "@/assets/avatars/stylist-purple-1.jpg";
import stylistBlue1 from "@/assets/avatars/stylist-blue-1.jpg";
import stylistOmbre1 from "@/assets/avatars/stylist-ombre-1.jpg";
import stylistTeal1 from "@/assets/avatars/stylist-teal-1.jpg";
import stylistLavender1 from "@/assets/avatars/stylist-lavender-1.jpg";
import stylistMagenta1 from "@/assets/avatars/stylist-magenta-1.jpg";
import stylistElectric1 from "@/assets/avatars/stylist-electric-1.jpg";

type Category = "all" | "salon-owners" | "independent" | "commission";

const categories: { id: Category; label: string }[] = [
  { id: "all", label: "All" },
  { id: "salon-owners", label: "Salon Owners" },
  { id: "independent", label: "Independent" },
  { id: "commission", label: "Commission" },
];

const Reviews = () => {
  const [activeCategory, setActiveCategory] = useState<Category>("all");

  const filteredReviews = activeCategory === "all" 
    ? reviews 
    : reviews.filter(review => review.category === activeCategory);

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-4xl mx-auto px-5 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-10">
          <Link to="/auth">
            <Button variant="ghost" size="sm" className="gap-2 -ml-2">
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
          </Link>
          
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
            Testimonials
          </p>
          <h1 className="font-termina text-3xl md:text-4xl font-bold tracking-[-0.006em] mb-3">
            Loved by Stylists
          </h1>
          <p className="text-muted-foreground max-w-md">
            See what professionals across the country are saying.
          </p>
        </div>

        {/* Category Filter */}
        <div className="flex flex-wrap gap-2 mb-8">
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => setActiveCategory(category.id)}
              className={cn(
                "px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 border",
                activeCategory === category.id
                  ? "bg-foreground text-background border-foreground"
                  : "bg-transparent text-muted-foreground border-border hover:border-foreground/30 hover:text-foreground"
              )}
            >
              {category.label}
            </button>
          ))}
        </div>

        {/* Featured review */}
        <div className="bg-foreground text-background rounded-2xl p-6 md:p-8 mb-8">
          <Quote className="h-8 w-8 text-background/20 mb-4" />
          <p className="text-lg md:text-xl font-medium leading-relaxed mb-6">
            "This platform has completely transformed how I run my business. The wholesale pricing alone has saved me thousands, and the community is incredibly supportive."
          </p>
          <div className="flex items-center gap-4">
            <img 
              src={stylistPink1} 
              alt="Sarah M." 
              className="w-12 h-12 rounded-full object-cover border-2 border-background/20"
            />
            <div>
              <h3 className="font-semibold">Sarah M.</h3>
              <p className="text-background/60 text-sm">Independent Stylist · Los Angeles</p>
            </div>
          </div>
        </div>

        {/* Avatars row */}
        <div className="flex items-center gap-3 mb-8 pb-8 border-b border-border">
          <div className="flex -space-x-2">
            {[stylistPink1, stylistPurple1, stylistBlue1, stylistOmbre1, stylistTeal1].map((avatar, i) => (
              <img 
                key={i}
                src={avatar} 
                alt="" 
                className="w-8 h-8 rounded-full border-2 border-background object-cover"
              />
            ))}
          </div>
          <span className="text-sm text-muted-foreground">
            Join 8,000+ stylists
          </span>
        </div>

        {/* Review grid */}
        <div className="space-y-4">
          {filteredReviews.map((review, index) => (
            <div 
              key={`${review.name}-${activeCategory}`}
              className="group border border-border rounded-xl p-5 transition-all duration-200 hover:border-foreground/20 animate-fade-in"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="flex items-start gap-4">
                <img 
                  src={review.avatar} 
                  alt={review.name} 
                  className="w-10 h-10 rounded-full object-cover"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <div>
                      <h3 className="font-semibold text-sm">{review.name}</h3>
                      <p className="text-xs text-muted-foreground">{review.title}</p>
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
                  <p className="text-sm text-foreground/80 leading-relaxed">{review.text}</p>
                  
                  {/* Tags */}
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {review.tags.map((tag, i) => (
                      <span 
                        key={i}
                        className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Empty state */}
        {filteredReviews.length === 0 && (
          <div className="text-center py-12 border border-border rounded-xl">
            <p className="text-muted-foreground">No reviews in this category yet.</p>
          </div>
        )}

        {/* CTA */}
        <div className="mt-12 pt-8 border-t border-border">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium mb-1">Ready to get started?</p>
              <p className="text-sm text-muted-foreground">Join thousands of happy stylists.</p>
            </div>
            <Link to="/auth">
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

const reviews = [
  {
    name: "Jessica R.",
    title: "Salon Owner · Miami",
    category: "salon-owners" as Category,
    rating: 5,
    text: "The product quality is unmatched. My clients constantly compliment the extensions I use, and I love being able to order everything in one place.",
    avatar: stylistPurple1,
    tags: ["Quality Products", "Fast Shipping"]
  },
  {
    name: "Amanda T.",
    title: "Commission Stylist · New York",
    category: "commission" as Category,
    rating: 5,
    text: "As someone just starting out, the community support has been invaluable. I've learned so much from other stylists here.",
    avatar: stylistBlue1,
    tags: ["Great Community", "Learning Resources"]
  },
  {
    name: "Michelle K.",
    title: "Salon Manager · Chicago",
    category: "salon-owners" as Category,
    rating: 5,
    text: "Managing inventory for our salon has never been easier. The ordering process is seamless and delivery is always fast.",
    avatar: stylistOmbre1,
    tags: ["Easy Ordering", "Inventory Management"]
  },
  {
    name: "Brittany L.",
    title: "Independent Stylist · Austin",
    category: "independent" as Category,
    rating: 5,
    text: "I love being part of a community of professionals who are passionate about their craft. The networking opportunities alone are worth it.",
    avatar: stylistTeal1,
    tags: ["Networking", "Pro Community"]
  },
  {
    name: "Lauren H.",
    title: "Independent Stylist · Denver",
    category: "independent" as Category,
    rating: 5,
    text: "Being independent can feel isolating, but this platform connects me with other stylists who understand the hustle. Plus, the pricing is incredible.",
    avatar: stylistLavender1,
    tags: ["Independent Life", "Great Pricing"]
  },
  {
    name: "Taylor S.",
    title: "Salon Owner · Seattle",
    category: "salon-owners" as Category,
    rating: 5,
    text: "Running a salon means juggling a million things. Having a reliable supplier with consistent quality has been a game-changer for my business.",
    avatar: stylistMagenta1,
    tags: ["Reliable Supply", "Business Growth"]
  },
  {
    name: "Nina M.",
    title: "Commission Stylist · Atlanta",
    category: "commission" as Category,
    rating: 5,
    text: "The educational resources helped me level up my skills. Now I can offer more services and my clients love the results.",
    avatar: stylistElectric1,
    tags: ["Education", "Skill Building"]
  },
  {
    name: "Rachel D.",
    title: "Independent Stylist · Portland",
    category: "independent" as Category,
    rating: 5,
    text: "Finally found a supplier that understands what professional stylists need. The quality speaks for itself - my clients keep coming back.",
    avatar: stylistPink1,
    tags: ["Client Retention", "Pro Quality"]
  }
];

export default Reviews;
