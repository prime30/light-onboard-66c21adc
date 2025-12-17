import { ArrowLeft, Calendar, Clock, ArrowUpRight, FileText, CheckCircle2, AlertCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import blogImage from "@/assets/blog-resale-license.jpg";

const BlogResaleLicense = () => {
  return (
    <div className="min-h-screen bg-black/60 backdrop-blur-sm flex items-start sm:items-center justify-center pt-12 sm:pt-0 px-0 sm:px-4">
      <div 
        className="w-full sm:w-[95vw] lg:w-[90vw] max-w-[900px] h-[calc(100vh-3rem)] sm:h-[90vh] bg-background rounded-t-[20px] sm:rounded-[25px] lg:rounded-[30px] shadow-2xl overflow-hidden animate-[pageSlideUp_0.5s_cubic-bezier(0.16,1,0.3,1)_forwards] flex flex-col"
      >
        <div className="flex-1 overflow-y-auto">
          {/* Header */}
          <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border/50 px-5 sm:px-8 py-4">
            <div className="flex items-center justify-between">
              <Link to="/auth">
                <Button variant="ghost" size="sm" className="gap-2 -ml-2">
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </Button>
              </Link>
              
              <span className="text-xs text-muted-foreground uppercase tracking-wider">
                Business Guide
              </span>
            </div>
          </div>

          {/* Hero Image */}
          <div className="relative aspect-[16/9] sm:aspect-[21/9] overflow-hidden">
            <img 
              src={blogImage} 
              alt="Professional reviewing business documents" 
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
            <div className="absolute bottom-4 left-5 sm:left-8">
              <span className="px-3 py-1 rounded-full bg-primary text-primary-foreground text-xs font-medium">
                Licensing
              </span>
            </div>
          </div>

          {/* Content */}
          <div className="px-5 sm:px-8 lg:px-12 py-8">
            {/* Meta */}
            <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
              <div className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4" />
                <span>December 15, 2024</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Clock className="w-4 h-4" />
                <span>5 min read</span>
              </div>
            </div>

            {/* Title */}
            <h1 className="font-termina text-2xl md:text-3xl lg:text-4xl font-medium uppercase tracking-[-0.006em] mb-6 text-balance">
              Why You Need a Resale License in Your State
            </h1>

            {/* Intro */}
            <p className="text-lg text-muted-foreground leading-relaxed mb-8">
              As a professional stylist or salon owner, understanding the importance of a resale license can save you money and keep your business compliant. Here's everything you need to know.
            </p>

            {/* Article Content */}
            <div className="prose prose-neutral dark:prose-invert max-w-none space-y-8">
              
              {/* Section 1 */}
              <section>
                <h2 className="font-termina text-xl font-medium uppercase tracking-[-0.006em] mb-4 flex items-center gap-3">
                  <FileText className="w-5 h-5 text-primary" />
                  What is a Resale License?
                </h2>
                <p className="text-foreground/80 leading-relaxed">
                  A resale license (also called a reseller's permit, sales tax permit, or wholesale license) is a document that allows you to purchase products wholesale without paying sales tax at the time of purchase. Instead, you collect sales tax from your end customers when you sell the products or services.
                </p>
              </section>

              {/* Section 2 */}
              <section>
                <h2 className="font-termina text-xl font-medium uppercase tracking-[-0.006em] mb-4 flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-status-green" />
                  Benefits of Having a Resale License
                </h2>
                <ul className="space-y-3">
                  <li className="flex items-start gap-3 text-foreground/80">
                    <span className="w-1.5 h-1.5 rounded-full bg-foreground mt-2.5 shrink-0" />
                    <span><strong>Tax Savings:</strong> Avoid paying sales tax on products you purchase for resale, improving your profit margins.</span>
                  </li>
                  <li className="flex items-start gap-3 text-foreground/80">
                    <span className="w-1.5 h-1.5 rounded-full bg-foreground mt-2.5 shrink-0" />
                    <span><strong>Wholesale Access:</strong> Many distributors require a resale license to access wholesale pricing.</span>
                  </li>
                  <li className="flex items-start gap-3 text-foreground/80">
                    <span className="w-1.5 h-1.5 rounded-full bg-foreground mt-2.5 shrink-0" />
                    <span><strong>Business Legitimacy:</strong> Shows suppliers and clients that you're a legitimate, registered business.</span>
                  </li>
                  <li className="flex items-start gap-3 text-foreground/80">
                    <span className="w-1.5 h-1.5 rounded-full bg-foreground mt-2.5 shrink-0" />
                    <span><strong>Legal Compliance:</strong> Operating without proper licensing can result in penalties and back taxes.</span>
                  </li>
                </ul>
              </section>

              {/* Section 3 */}
              <section>
                <h2 className="font-termina text-xl font-medium uppercase tracking-[-0.006em] mb-4 flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-500" />
                  How to Get Your Resale License
                </h2>
                <div className="bg-muted/50 border border-border/50 rounded-xl p-5 space-y-4">
                  <div className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-foreground text-background text-sm font-medium flex items-center justify-center shrink-0">1</span>
                    <div>
                      <p className="font-medium">Register your business</p>
                      <p className="text-sm text-muted-foreground">Obtain an EIN and register your business entity with your state.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-foreground text-background text-sm font-medium flex items-center justify-center shrink-0">2</span>
                    <div>
                      <p className="font-medium">Apply with your state's tax authority</p>
                      <p className="text-sm text-muted-foreground">Visit your state's Department of Revenue website to apply online.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-foreground text-background text-sm font-medium flex items-center justify-center shrink-0">3</span>
                    <div>
                      <p className="font-medium">Receive your certificate</p>
                      <p className="text-sm text-muted-foreground">Most states process applications within 1-2 weeks.</p>
                    </div>
                  </div>
                </div>
              </section>

              {/* Callout */}
              <div className="bg-primary/10 border border-primary/20 rounded-xl p-6">
                <p className="text-sm text-primary font-medium mb-2">Pro Tip</p>
                <p className="text-foreground/80">
                  Even if you don't have a resale license yet, you can still register with us! Once you obtain your license, simply upload it to your account to unlock tax-exempt purchasing.
                </p>
              </div>
            </div>

            {/* CTA */}
            <div className="mt-12 pt-8 border-t border-border">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <p className="font-medium mb-1">Ready to get started?</p>
                  <p className="text-sm text-muted-foreground">Continue your registration to join our community.</p>
                </div>
                <Link to="/auth">
                  <Button className="gap-2 rounded-full">
                    Continue Registration
                    <ArrowUpRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BlogResaleLicense;
