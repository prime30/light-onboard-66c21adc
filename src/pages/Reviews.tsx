import { ArrowLeft, Star, Quote, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import stylistPink1 from "@/assets/avatars/stylist-pink-1.jpg";
import stylistPurple1 from "@/assets/avatars/stylist-purple-1.jpg";
import stylistBlue1 from "@/assets/avatars/stylist-blue-1.jpg";
import stylistOmbre1 from "@/assets/avatars/stylist-ombre-1.jpg";
import stylistTeal1 from "@/assets/avatars/stylist-teal-1.jpg";

const Reviews = () => {
  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Gradient background elements */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-gradient-to-br from-pink-500/10 via-purple-500/10 to-transparent rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-gradient-to-tl from-blue-500/10 via-teal-500/10 to-transparent rounded-full blur-3xl pointer-events-none" />
      
      <div className="container max-w-5xl mx-auto px-5 py-8 relative z-10">
        <Link to="/auth">
          <Button variant="ghost" size="sm" className="mb-8 gap-2 hover:bg-muted/50">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
        </Link>
        
        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-pink-500/10 via-purple-500/10 to-blue-500/10 border border-pink-500/20 mb-6">
            <Sparkles className="h-3.5 w-3.5 text-pink-500" />
            <span className="text-xs font-medium bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 bg-clip-text text-transparent">
              8,000+ Happy Stylists
            </span>
          </div>
          <h1 className="font-termina text-4xl md:text-5xl font-bold tracking-[-0.006em] mb-4 text-balance">
            Loved by{" "}
            <span className="bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 bg-clip-text text-transparent">
              Professionals
            </span>
          </h1>
          <p className="text-muted-foreground max-w-lg mx-auto text-lg">
            See what stylists across the country are saying about their experience.
          </p>
          
          {/* Floating avatars */}
          <div className="flex justify-center items-center gap-1 mt-8">
            <div className="flex -space-x-3">
              {[stylistPink1, stylistPurple1, stylistBlue1, stylistOmbre1, stylistTeal1].map((avatar, i) => (
                <img 
                  key={i}
                  src={avatar} 
                  alt="" 
                  className="w-10 h-10 rounded-full border-2 border-background object-cover"
                  style={{ animationDelay: `${i * 100}ms` }}
                />
              ))}
            </div>
            <div className="ml-3 flex items-center gap-1">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
              ))}
              <span className="ml-2 text-sm font-medium">4.9</span>
            </div>
          </div>
        </div>

        {/* Featured review */}
        <div className="relative mb-12">
          <div className="absolute inset-0 bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 rounded-3xl blur-sm opacity-20" />
          <div className="relative bg-card/80 backdrop-blur-sm border border-border/50 rounded-3xl p-8 md:p-10">
            <Quote className="h-10 w-10 text-pink-500/30 mb-4" />
            <p className="text-xl md:text-2xl font-medium leading-relaxed mb-6 text-foreground/90">
              "This platform has completely transformed how I run my business. The wholesale pricing alone has saved me thousands, and the community is incredibly supportive."
            </p>
            <div className="flex items-center gap-4">
              <img 
                src={stylistPink1} 
                alt="Sarah M." 
                className="w-14 h-14 rounded-full object-cover border-2 border-pink-500/30"
              />
              <div>
                <h3 className="font-semibold text-lg">Sarah M.</h3>
                <p className="text-muted-foreground">Independent Stylist · Los Angeles</p>
              </div>
              <div className="ml-auto flex gap-0.5">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Review grid */}
        <div className="grid md:grid-cols-2 gap-6">
          {reviews.map((review, index) => (
            <div 
              key={index}
              className={cn(
                "group relative bg-card/50 backdrop-blur-sm border border-border/50 rounded-2xl p-6 transition-all duration-300 hover:border-border hover:shadow-lg",
                "animate-fade-in"
              )}
              style={{ animationDelay: `${index * 100}ms` }}
            >
              {/* Accent gradient on hover */}
              <div className={cn(
                "absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none",
                review.accentGradient
              )} />
              
              <div className="relative">
                <div className="flex items-start gap-4 mb-4">
                  <img 
                    src={review.avatar} 
                    alt={review.name} 
                    className={cn(
                      "w-12 h-12 rounded-full object-cover border-2",
                      review.borderColor
                    )}
                  />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold">{review.name}</h3>
                        <p className="text-sm text-muted-foreground">{review.title}</p>
                      </div>
                      <div className="flex gap-0.5">
                        {[...Array(5)].map((_, i) => (
                          <Star 
                            key={i} 
                            className={cn(
                              "h-4 w-4",
                              i < review.rating ? "fill-yellow-400 text-yellow-400" : "text-muted"
                            )}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
                <p className="text-foreground/80 leading-relaxed">{review.text}</p>
                
                {/* Tags */}
                <div className="flex flex-wrap gap-2 mt-4">
                  {review.tags.map((tag, i) => (
                    <span 
                      key={i}
                      className={cn(
                        "text-xs px-2.5 py-1 rounded-full",
                        review.tagStyle
                      )}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="text-center mt-16 pb-8">
          <p className="text-muted-foreground mb-4">Ready to join thousands of happy stylists?</p>
          <Link to="/auth">
            <Button 
              size="lg" 
              className="bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 hover:opacity-90 text-white border-0 rounded-full px-8"
            >
              Apply for Pro Account
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};

const reviews = [
  {
    name: "Jessica R.",
    title: "Salon Owner · Miami",
    rating: 5,
    text: "The product quality is unmatched. My clients constantly compliment the extensions I use, and I love being able to order everything in one place.",
    avatar: stylistPurple1,
    borderColor: "border-purple-500/30",
    accentGradient: "bg-gradient-to-br from-purple-500/5 to-transparent",
    tagStyle: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
    tags: ["Quality Products", "Fast Shipping"]
  },
  {
    name: "Amanda T.",
    title: "Commission Stylist · New York",
    rating: 5,
    text: "As someone just starting out, the community support has been invaluable. I've learned so much from other stylists here.",
    avatar: stylistBlue1,
    borderColor: "border-blue-500/30",
    accentGradient: "bg-gradient-to-br from-blue-500/5 to-transparent",
    tagStyle: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
    tags: ["Great Community", "Learning Resources"]
  },
  {
    name: "Michelle K.",
    title: "Salon Manager · Chicago",
    rating: 5,
    text: "Managing inventory for our salon has never been easier. The ordering process is seamless and delivery is always fast.",
    avatar: stylistOmbre1,
    borderColor: "border-pink-500/30",
    accentGradient: "bg-gradient-to-br from-pink-500/5 to-transparent",
    tagStyle: "bg-pink-500/10 text-pink-600 dark:text-pink-400",
    tags: ["Easy Ordering", "Inventory Management"]
  },
  {
    name: "Brittany L.",
    title: "Independent Stylist · Austin",
    rating: 5,
    text: "I love being part of a community of professionals who are passionate about their craft. The networking opportunities alone are worth it.",
    avatar: stylistTeal1,
    borderColor: "border-teal-500/30",
    accentGradient: "bg-gradient-to-br from-teal-500/5 to-transparent",
    tagStyle: "bg-teal-500/10 text-teal-600 dark:text-teal-400",
    tags: ["Networking", "Pro Community"]
  }
];

export default Reviews;
