
import React, { useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useNavigate } from 'react-router-dom';
import { Wrench, ClipboardList, BarChart3, UserCircle, Shield, CheckCircle2, Star, CreditCard, Lock, Users, Clock, ArrowRight } from 'lucide-react';

const Index = () => {
  const navigate = useNavigate();

  useEffect(() => {
    document.title = 'Supported Accommodation Property Management | MaintenanceHub';
    const metaDesc = 'All-in-one maintenance platform built for supported accommodation providers. Try free for 30 days.';
    let descTag = document.querySelector('meta[name="description"]');
    if (!descTag) {
      descTag = document.createElement('meta');
      descTag.setAttribute('name', 'description');
      document.head.appendChild(descTag);
    }
    descTag.setAttribute('content', metaDesc);

    const canonicalUrl = window.location.origin + '/';
    let linkCanonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!linkCanonical) {
      linkCanonical = document.createElement('link');
      linkCanonical.setAttribute('rel', 'canonical');
      document.head.appendChild(linkCanonical);
    }
    linkCanonical.setAttribute('href', canonicalUrl);

    const ld = {
      '@context': 'https://schema.org',
      '@type': 'SoftwareApplication',
      name: 'MaintenanceHub',
      applicationCategory: 'BusinessApplication',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD', description: '30-day free trial' },
      description: metaDesc
    } as const;
    let ldScript = document.getElementById('ld-product');
    if (ldScript) {
      ldScript.textContent = JSON.stringify(ld);
    } else {
      const s = document.createElement('script');
      s.type = 'application/ld+json';
      s.id = 'ld-product';
      s.text = JSON.stringify(ld);
      document.head.appendChild(s);
    }

    // FAQ structured data
    const faq = {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: [
        {
          '@type': 'Question',
          name: 'Do I need a credit card for the 30-day free trial?',
          acceptedAnswer: { '@type': 'Answer', text: 'No credit card required to start the free trial.' }
        },
        {
          '@type': 'Question',
          name: 'Is MaintenanceHub secure for supported accommodation data?',
          acceptedAnswer: { '@type': 'Answer', text: 'Yes. Role-based access control, RLS policies and encrypted storage are used to protect your data.' }
        },
        {
          '@type': 'Question',
          name: 'Can residents or staff submit requests?',
          acceptedAnswer: { '@type': 'Answer', text: 'Yes. Staff can submit requests and you can optionally enable resident portals with approvals.' }
        },
        {
          '@type': 'Question',
          name: 'Can I cancel anytime?',
          acceptedAnswer: { '@type': 'Answer', text: 'Yes, you can cancel at any time during or after the trial from account settings.' }
        }
      ]
    } as const;
    let faqScript = document.getElementById('ld-faq');
    if (faqScript) {
      faqScript.textContent = JSON.stringify(faq);
    } else {
      const f = document.createElement('script');
      f.type = 'application/ld+json';
      f.id = 'ld-faq';
      f.text = JSON.stringify(faq);
      document.head.appendChild(f);
    }
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="text-2xl font-bold text-gray-900">MaintenanceHub</div>
            <div className="flex items-center gap-3">
              <Button 
                variant="ghost" 
                size="sm" 
                className="flex items-center gap-2"
                onClick={() => navigate('/login')}
              >
                <UserCircle size={20} />
                <span>Login</span>
              </Button>
              <Button 
                variant="default" 
                size="sm"
                onClick={() => navigate('/signup')}
              >
                Create Account
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main>
        {/* Hero Section */}
        <section className="py-12 bg-gradient-to-br from-blue-500 to-teal-400 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="md:flex md:items-center md:justify-between">
            <div className="md:w-1/2">
              <h1 className="text-4xl font-bold mb-4">Built for Supported Accommodation Property Management</h1>
              <p className="text-xl mb-8">
                Streamline maintenance, compliance, and contractor workflows—try MaintenanceHub free for 30 days.
              </p>
              <div className="flex flex-wrap gap-4">
                <Button onClick={() => navigate('/signup')} className="bg-white text-blue-600 hover:bg-gray-100">
                  Start free 30-day trial
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => {
                    const el = document.getElementById('features');
                    el?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="border-white text-white hover:bg-white/10"
                >
                  See features
                </Button>
              </div>
            </div>
            <div className="hidden md:block md:w-1/2">
              <div className="relative h-64 w-full">
                <div className="absolute inset-0 bg-white/10 backdrop-blur-sm rounded-lg shadow-lg transform rotate-3"></div>
                <div className="absolute inset-0 bg-white/10 backdrop-blur-sm rounded-lg shadow-lg -rotate-2"></div>
                <div className="absolute inset-0 bg-white/20 backdrop-blur-sm rounded-lg shadow-lg"></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center mb-12 text-gray-900">
            Why Supported Accommodation Providers Choose MaintenanceHub
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <FeatureCard 
              icon={<Wrench className="h-10 w-10 text-blue-500" />}
              title="Streamlined Requests"
              description="Submit and track maintenance requests through an intuitive interface. Upload photos and provide detailed descriptions."
            />
            <FeatureCard 
              icon={<ClipboardList className="h-10 w-10 text-blue-500" />}
              title="Comprehensive Tracking"
              description="Monitor the status of every request from submission to completion. Never lose track of a maintenance issue again."
            />
            <FeatureCard 
              icon={<BarChart3 className="h-10 w-10 text-blue-500" />}
              title="Insightful Analytics"
              description="Gain valuable insights with detailed reporting on maintenance trends, response times, and team performance."
            />
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="py-16 bg-white animate-fade-in">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center mb-12 text-gray-900">How it works</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-gray-50 p-6 rounded-lg shadow-sm hover-scale">
              <div className="flex items-center gap-3 mb-3">
                <Users className="h-6 w-6 text-blue-500" />
                <h3 className="font-semibold text-gray-900">1. Invite your team</h3>
              </div>
              <p className="text-gray-600">Set up managers and contractors with role-based permissions for secure collaboration.</p>
            </div>
            <div className="bg-gray-50 p-6 rounded-lg shadow-sm hover-scale">
              <div className="flex items-center gap-3 mb-3">
                <ClipboardList className="h-6 w-6 text-blue-500" />
                <h3 className="font-semibold text-gray-900">2. Log maintenance</h3>
              </div>
              <p className="text-gray-600">Capture requests with photos, assign to the right contractor, and track progress.</p>
            </div>
            <div className="bg-gray-50 p-6 rounded-lg shadow-sm hover-scale">
              <div className="flex items-center gap-3 mb-3">
                <CheckCircle2 className="h-6 w-6 text-blue-500" />
                <h3 className="font-semibold text-gray-900">3. Resolve & report</h3>
              </div>
              <p className="text-gray-600">Close jobs with an audit trail and view analytics for spend, SLAs, and compliance.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Security & compliance */}
      <section id="security" className="py-16 bg-gray-50 animate-fade-in">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div>
              <h2 className="text-3xl font-bold mb-4 text-gray-900 flex items-center gap-2">
                <Shield className="h-7 w-7 text-blue-500" /> Security & compliance
              </h2>
              <p className="text-gray-600 mb-6">Purpose-built for supported accommodation providers with enterprise-grade security.</p>
              <ul className="space-y-3 text-gray-700">
                <li className="flex items-center gap-2"><Lock className="h-5 w-5 text-blue-500" /> Role-based access control</li>
                <li className="flex items-center gap-2"><Shield className="h-5 w-5 text-blue-500" /> Row-Level Security (RLS) on all data</li>
                <li className="flex items-center gap-2"><Clock className="h-5 w-5 text-blue-500" /> Full activity history and audit trail</li>
                <li className="flex items-center gap-2"><CreditCard className="h-5 w-5 text-blue-500" /> PCI-compliant Stripe billing (coming soon)</li>
              </ul>
            </div>
            <div className="bg-white rounded-lg shadow p-6 hover-scale">
              <div className="grid grid-cols-2 gap-4 text-center">
                <div className="p-4 rounded-md bg-gray-50">
                  <div className="text-2xl font-bold text-gray-900">99.9%</div>
                  <div className="text-gray-600">Uptime target</div>
                </div>
                <div className="p-4 rounded-md bg-gray-50">
                  <div className="text-2xl font-bold text-gray-900">EU/UK</div>
                  <div className="text-gray-600">Data residency</div>
                </div>
                <div className="p-4 rounded-md bg-gray-50">
                  <div className="text-2xl font-bold text-gray-900">Encryption</div>
                  <div className="text-gray-600">At rest & in transit</div>
                </div>
                <div className="p-4 rounded-md bg-gray-50">
                  <div className="text-2xl font-bold text-gray-900">Backups</div>
                  <div className="text-gray-600">Daily snapshots</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-16 bg-white animate-fade-in">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900">Simple pricing</h2>
            <p className="text-gray-600">Start free for 30 days. No credit card required.</p>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="border rounded-lg p-6 bg-gray-50 hover-scale">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-900">Starter</h3>
                <span className="text-gray-900 text-2xl font-bold">£49<span className="text-base font-normal text-gray-600">/mo</span></span>
              </div>
              <ul className="space-y-2 text-gray-700 mb-6">
                <li className="flex items-center gap-2"><CheckCircle2 className="h-5 w-5 text-blue-500" /> Up to 5 properties</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="h-5 w-5 text-blue-500" /> Unlimited requests</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="h-5 w-5 text-blue-500" /> Contractor portal</li>
              </ul>
              <Button className="w-full" onClick={() => navigate('/signup')}>Start free trial</Button>
            </div>
            <div className="border rounded-lg p-6 bg-white shadow hover-scale">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-900">Pro</h3>
                <span className="text-gray-900 text-2xl font-bold">£99<span className="text-base font-normal text-gray-600">/mo</span></span>
              </div>
              <ul className="space-y-2 text-gray-700 mb-6">
                <li className="flex items-center gap-2"><CheckCircle2 className="h-5 w-5 text-blue-500" /> Unlimited properties</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="h-5 w-5 text-blue-500" /> Advanced reporting</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="h-5 w-5 text-blue-500" /> Priority support</li>
              </ul>
              <Button className="w-full" onClick={() => navigate('/signup')}>Start free trial</Button>
            </div>
          </div>
          <p className="text-sm text-gray-500 mt-4 text-center">
            Prices are placeholders. Stripe self-serve signup coming soon.
          </p>
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="py-16 bg-gray-50 animate-fade-in">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center mb-12 text-gray-900">What providers say</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <TestimonialCard
              quote="MaintenanceHub lets our support staff raise issues quickly and our contractors know exactly what to do."
              author="Operations Lead, Supported Living Provider"
              rating={5}
            />
            <TestimonialCard
              quote="Clear audit trails and reporting make compliance reviews painless."
              author="Registered Manager, Accommodation Service"
              rating={5}
            />
          </div>
        </div>
      </section>

      {/* FAQs */}
      <section id="faq" className="py-16 bg-white animate-fade-in">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center mb-8 text-gray-900">Frequently asked questions</h2>
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="q1">
              <AccordionTrigger>Do I need a credit card to start?</AccordionTrigger>
              <AccordionContent>No—start your 30-day free trial without a card.</AccordionContent>
            </AccordionItem>
            <AccordionItem value="q2">
              <AccordionTrigger>Is data secure and compliant?</AccordionTrigger>
              <AccordionContent>Yes. We use role-based access, RLS, and encrypted storage.</AccordionContent>
            </AccordionItem>
            <AccordionItem value="q3">
              <AccordionTrigger>Can I cancel anytime?</AccordionTrigger>
              <AccordionContent>Yes, you can cancel at any time in settings.</AccordionContent>
            </AccordionItem>
            <AccordionItem value="q4">
              <AccordionTrigger>Can residents submit requests?</AccordionTrigger>
              <AccordionContent>Staff can submit on behalf of residents; resident access can be enabled with approvals.</AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-16 bg-gray-100 animate-fade-in">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold mb-4 text-gray-900">Start your 30-day free trial</h2>
          <p className="text-xl mb-8 text-gray-600">App built specifically for Supported Accommodation providers.</p>
          <div className="flex justify-center gap-4">
            <Button onClick={() => navigate('/signup')} size="lg" className="bg-blue-500 hover:bg-blue-600">
              Get started free <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button onClick={() => navigate('/login')} variant="outline" size="lg" className="border-blue-500 text-blue-500 hover:bg-blue-500 hover:text-white">
              Sign in
            </Button>
          </div>
        </div>
      </section>

      </main>
      {/* Footer */}
      <footer className="bg-gray-800 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <h3 className="text-lg font-semibold mb-4">MaintenanceHub</h3>
              <p className="text-gray-300">
                Simplifying maintenance management for facilities of all sizes.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4">Quick Links</h3>
              <ul className="space-y-2">
                <li><a href="#features" className="text-gray-300 hover:text-white">Features</a></li>
                <li><a href="/signup" className="text-gray-300 hover:text-white">Start free trial</a></li>
                <li><a href="/login" className="text-gray-300 hover:text-white">Sign in</a></li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4">Contact</h3>
              <p className="text-gray-300">
                Email: support@maintenancehub.com<br />
                Phone: (555) 123-4567
              </p>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-gray-700 text-center text-gray-400">
            <p>&copy; 2025 MaintenanceHub. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

const FeatureCard = ({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) => {
  return (
    <div className="bg-white p-6 rounded-lg shadow-md transition-all hover:shadow-lg hover-scale animate-fade-in">
      <div className="flex justify-center mb-4">
        {icon}
      </div>
      <h3 className="text-xl font-semibold mb-3 text-gray-900 text-center">{title}</h3>
      <p className="text-gray-600 text-center">{description}</p>
    </div>
  );
};

const TestimonialCard = ({ quote, author, rating = 5 }: { quote: string; author: string; rating?: number }) => {
  return (
    <div className="bg-white p-6 rounded-lg shadow hover:shadow-lg hover-scale">
      <div className="flex items-center gap-1 mb-3" aria-label={`${rating} out of 5 stars`}>
        {Array.from({ length: rating }).map((_, i) => (
          <Star key={i} className="h-4 w-4 text-yellow-500 fill-yellow-500" />
        ))}
      </div>
      <p className="text-gray-700 italic mb-3">“{quote}”</p>
      <div className="text-gray-900 font-medium">{author}</div>
    </div>
  );
};

export default Index;
