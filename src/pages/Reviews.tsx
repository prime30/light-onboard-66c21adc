import { ArrowLeft, Star } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const Reviews = () => {
  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-4xl mx-auto px-5 py-8">
        <Link to="/auth">
          <Button variant="ghost" size="sm" className="mb-6 gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
        </Link>
        
        <div className="text-center mb-12">
          <h1 className="font-termina text-3xl md:text-4xl font-bold tracking-[-0.006em] mb-4">
            Loved by Stylists
          </h1>
          <p className="text-muted-foreground max-w-md mx-auto">
            See what professional stylists are saying about their experience.
          </p>
        </div>

        <div className="grid gap-6">
          {reviews.map((review, index) => (
            <div 
              key={index}
              className="bg-card border border-border rounded-2xl p-6 animate-fade-in"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center text-lg font-semibold">
                  {review.name.charAt(0)}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <h3 className="font-semibold">{review.name}</h3>
                      <p className="text-sm text-muted-foreground">{review.title}</p>
                    </div>
                    <div className="flex gap-0.5">
                      {[...Array(5)].map((_, i) => (
                        <Star 
                          key={i} 
                          className={`h-4 w-4 ${i < review.rating ? "fill-yellow-400 text-yellow-400" : "text-muted"}`} 
                        />
                      ))}
                    </div>
                  </div>
                  <p className="text-foreground/80 leading-relaxed">{review.text}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const reviews = [
  {
    name: "Sarah M.",
    title: "Independent Stylist",
    rating: 5,
    text: "Finally, a platform that understands what professional stylists need. The wholesale pricing has helped me increase my margins significantly."
  },
  {
    name: "Jessica R.",
    title: "Salon Owner",
    rating: 5,
    text: "The product quality is unmatched. My clients constantly compliment the extensions I use, and I love being able to order everything in one place."
  },
  {
    name: "Amanda T.",
    title: "Commission Stylist",
    rating: 5,
    text: "As someone just starting out, the community support has been invaluable. I've learned so much from other stylists here."
  },
  {
    name: "Michelle K.",
    title: "Salon Manager",
    rating: 5,
    text: "Managing inventory for our salon has never been easier. The ordering process is seamless and delivery is always fast."
  },
  {
    name: "Brittany L.",
    title: "Independent Stylist",
    rating: 5,
    text: "I love being part of a community of professionals who are passionate about their craft. The networking opportunities alone are worth it."
  }
];

export default Reviews;
