import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useUserContext } from "@/contexts/UnifiedAuthContext";
import { SubscriptionProvider, useSubscription } from "@/contexts/subscription/SubscriptionContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Building2, Calculator, CreditCard, Zap } from "lucide-react";
import { toast } from "sonner";

const PricingContent: React.FC = () => {
  const [isStartingTrial, setIsStartingTrial] = useState(false);
  const navigate = useNavigate();
  const { currentUser } = useUserContext();
  const { startTrial } = useSubscription();

  const handleStartTrial = async () => {
    if (!currentUser) {
      navigate("/signup");
      return;
    }

    setIsStartingTrial(true);
    try {
      const result = await startTrial();
      if (result.success) {
        toast.success("Welcome! Your 14-day free trial has started.");
        navigate("/dashboard");
      } else {
        toast.error(result.error || "Failed to start trial");
      }
    } catch (error) {
      toast.error("An error occurred while starting your trial");
    } finally {
      setIsStartingTrial(false);
    }
  };

  // Sample property counts for pricing examples
  const pricingExamples = [
    { properties: 1, monthlyPrice: 29 },
    { properties: 5, monthlyPrice: 145 },
    { properties: 10, monthlyPrice: 290 },
    { properties: 25, monthlyPrice: 725 },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
      {/* Hero Section */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <Badge variant="secondary" className="mb-4">
            <Zap className="w-4 h-4 mr-1" />
            Simple Property-Based Pricing
          </Badge>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
            Pay Only for What You
            <span className="text-primary block">Actually Manage</span>
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            No complex tiers, no hidden fees. Just $29 AUD per property per month. 
            Start with a 14-day free trial - no credit card required.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
            <Button 
              size="lg" 
              onClick={handleStartTrial}
              disabled={isStartingTrial}
              className="min-w-48"
            >
              {isStartingTrial ? "Starting Trial..." : "Start Free Trial"}
            </Button>
            <p className="text-sm text-muted-foreground">
              No credit card required • Cancel anytime
            </p>
          </div>
        </div>
      </section>

      {/* Pricing Calculator */}
      <section className="py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <Calculator className="w-12 h-12 text-primary mx-auto mb-4" />
            <h2 className="text-3xl font-bold mb-4">Simple Pricing Calculator</h2>
            <p className="text-muted-foreground">See exactly what you'll pay based on your properties</p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {pricingExamples.map((example) => (
              <Card key={example.properties} className="text-center hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-center justify-center mb-2">
                    <Building2 className="w-8 h-8 text-primary" />
                  </div>
                  <CardTitle className="text-2xl">
                    {example.properties} {example.properties === 1 ? 'Property' : 'Properties'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-primary mb-2">
                    ${example.monthlyPrice}
                  </div>
                  <p className="text-muted-foreground mb-4">per month</p>
                  <div className="text-sm text-muted-foreground">
                    ${example.monthlyPrice / example.properties} per property
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <Card className="p-8">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl mb-4">Everything You Need Included</CardTitle>
              <CardDescription>All features available at every level - no restrictions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <Check className="h-5 w-5 text-green-500 flex-shrink-0" />
                    <span>Unlimited maintenance requests</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Check className="h-5 w-5 text-green-500 flex-shrink-0" />
                    <span>Contractor management & quotes</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Check className="h-5 w-5 text-green-500 flex-shrink-0" />
                    <span>Property & tenant tracking</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Check className="h-5 w-5 text-green-500 flex-shrink-0" />
                    <span>Budget management & reporting</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Check className="h-5 w-5 text-green-500 flex-shrink-0" />
                    <span>Email notifications & alerts</span>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <Check className="h-5 w-5 text-green-500 flex-shrink-0" />
                    <span>QR code access for tenants</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Check className="h-5 w-5 text-green-500 flex-shrink-0" />
                    <span>Document & photo management</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Check className="h-5 w-5 text-green-500 flex-shrink-0" />
                    <span>Financial tracking & insights</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Check className="h-5 w-5 text-green-500 flex-shrink-0" />
                    <span>Multi-user organization support</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Check className="h-5 w-5 text-green-500 flex-shrink-0" />
                    <span>Priority email support</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 px-4 bg-muted/30">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">How It Works</h2>
            <p className="text-muted-foreground">Get started in minutes with our simple process</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center text-primary-foreground font-bold text-xl mx-auto mb-4">
                1
              </div>
              <h3 className="text-xl font-semibold mb-3">Start Free Trial</h3>
              <p className="text-muted-foreground">
                Sign up and get 14 days free access to all features. No credit card required.
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center text-primary-foreground font-bold text-xl mx-auto mb-4">
                2
              </div>
              <h3 className="text-xl font-semibold mb-3">Add Properties</h3>
              <p className="text-muted-foreground">
                Add your properties to the platform. Your billing automatically adjusts to match.
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center text-primary-foreground font-bold text-xl mx-auto mb-4">
                3
              </div>
              <h3 className="text-xl font-semibold mb-3">Upgrade When Ready</h3>
              <p className="text-muted-foreground">
                Before your trial ends, add payment details to continue. Pay only for active properties.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <CreditCard className="w-16 h-16 text-primary mx-auto mb-6" />
          <h2 className="text-3xl font-bold mb-4">Ready to Get Started?</h2>
          <p className="text-muted-foreground mb-8">
            Join property managers who are simplifying their workflow with transparent, 
            property-based pricing.
          </p>
          
          <Button 
            size="lg" 
            onClick={handleStartTrial}
            disabled={isStartingTrial}
            className="min-w-48"
          >
            {isStartingTrial ? "Starting Trial..." : "Start Your Free Trial"}
          </Button>
          
          <div className="mt-8 text-sm text-muted-foreground space-y-1">
            <p>✓ 14-day free trial</p>
            <p>✓ No setup fees</p>
            <p>✓ Cancel anytime</p>
          </div>
        </div>
      </section>
    </div>
  );
};

const Pricing: React.FC = () => {
  return (
    <SubscriptionProvider>
      <PricingContent />
    </SubscriptionProvider>
  );
};

export default Pricing;