
import React, { useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useNavigate, Link } from 'react-router-dom';
import { Wrench, ClipboardList, BarChart3, UserCircle, Shield, CheckCircle2, Star, CreditCard, Lock, Users, Clock, ArrowRight } from 'lucide-react';
import { useSimpleAuth } from '@/contexts/UnifiedAuthContext';
import contractorQuotesImg from "@/assets/contractor-quotes-screenshot.jpg";
import jobTrackingImg from "@/assets/job-tracking-screenshot.jpg";
import communicationImg from "@/assets/communication-screenshot.jpg";

const Index = () => {
  const navigate = useNavigate();
  const { currentUser, loading } = useSimpleAuth();

  // Redirect authenticated users to dashboard
  // Note: Always go to /dashboard - let OrganizationOnboarding handle contractor routing
  useEffect(() => {
    if (!loading && currentUser) {
      navigate('/dashboard', { replace: true });
    }
  }, [currentUser, loading, navigate]);

  useEffect(() => {
    document.title = 'Supported Accommodation Property Management | HousingHub';
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
      name: 'HousingHub',
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
          name: 'Is HousingHub secure for supported accommodation data?',
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
            <div className="text-2xl font-bold text-gray-900">HousingHub</div>
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
              <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm px-3 py-1.5 rounded-full mb-4 text-sm font-medium">
                <CheckCircle2 className="h-4 w-4" />
                <span>Trusted by NDIS providers across NSW</span>
              </div>
              <h1 className="text-4xl font-bold mb-4">Take the Middleman Out of Maintenance Management</h1>
              <p className="text-xl mb-8">
                Link managers, contractors, and staff directly — request quotes, approve jobs, and track progress in one simple platform.
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
                  className="bg-transparent border-white text-white hover:bg-white/10"
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

      {/* Why It's Different Section */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center mb-12 text-gray-900">
            Why It's Different
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white p-6 rounded-lg shadow-sm hover-scale">
              <h3 className="text-xl font-semibold mb-3 text-gray-900">No More Middlemen</h3>
              <p className="text-gray-600">
                Connect property managers, contractors, and staff directly. No more message relays or delays — everyone sees what's happening in real time.
              </p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-sm hover-scale">
              <h3 className="text-xl font-semibold mb-3 text-gray-900">Smarter Job Management</h3>
              <p className="text-gray-600">
                From quote requests to completion and invoicing, everything flows through one system with manager approval steps built in.
              </p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-sm hover-scale">
              <h3 className="text-xl font-semibold mb-3 text-gray-900">Complete Visibility</h3>
              <p className="text-gray-600">
                All job details, messages, photos, and invoices are linked to their property — giving full transparency for everyone involved.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center mb-12 text-gray-900">
            Why Providers Choose HousingHub
          </h2>
          <div className="space-y-16">
            {/* Feature 1 */}
            <div className="grid md:grid-cols-2 gap-8 items-center">
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <Wrench className="h-10 w-10 text-blue-500" />
                  <h3 className="text-2xl font-semibold text-gray-900">Streamlined Contractor Management</h3>
                </div>
                <p className="text-lg text-gray-600">
                  Invite contractors, view availability, request quotes, and assign jobs instantly.
                </p>
              </div>
              <div className="rounded-lg overflow-hidden shadow-lg hover-scale">
                <img 
                  src={contractorQuotesImg} 
                  alt="Contractor quote comparison interface showing multiple quotes side by side"
                  className="w-full h-auto"
                />
              </div>
            </div>

            {/* Feature 2 */}
            <div className="grid md:grid-cols-2 gap-8 items-center">
              <div className="md:order-2">
                <div className="flex items-center gap-3 mb-4">
                  <ClipboardList className="h-10 w-10 text-blue-500" />
                  <h3 className="text-2xl font-semibold text-gray-900">Automated Maintenance Workflow</h3>
                </div>
                <p className="text-lg text-gray-600">
                  Submit requests, approve work, and handle invoices — all in one place.
                </p>
              </div>
              <div className="md:order-1 rounded-lg overflow-hidden shadow-lg hover-scale">
                <img 
                  src={jobTrackingImg} 
                  alt="Job tracking dashboard showing maintenance requests in various stages"
                  className="w-full h-auto"
                />
              </div>
            </div>

            {/* Feature 3 */}
            <div className="grid md:grid-cols-2 gap-8 items-center">
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <BarChart3 className="h-10 w-10 text-blue-500" />
                  <h3 className="text-2xl font-semibold text-gray-900">Transparent Communication</h3>
                </div>
                <p className="text-lg text-gray-600">
                  Everyone stays in the loop. Track status updates, ask questions, and view progress without chasing messages.
                </p>
              </div>
              <div className="rounded-lg overflow-hidden shadow-lg hover-scale">
                <img 
                  src={communicationImg} 
                  alt="Communication interface showing messages between managers, contractors, and staff"
                  className="w-full h-auto"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="py-16 bg-white animate-fade-in">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center mb-12 text-gray-900">How It Works — From Request to Resolution</h2>
          <div className="grid md:grid-cols-4 gap-6">
            <div className="bg-gray-50 p-6 rounded-lg shadow-sm hover-scale">
              <div className="flex items-center gap-3 mb-3">
                <ClipboardList className="h-6 w-6 text-blue-500" />
                <h3 className="font-semibold text-gray-900">1. Submit Maintenance Request</h3>
              </div>
              <p className="text-gray-600">Staff or tenants log requests with photos and details.</p>
            </div>
            <div className="bg-gray-50 p-6 rounded-lg shadow-sm hover-scale">
              <div className="flex items-center gap-3 mb-3">
                <CheckCircle2 className="h-6 w-6 text-blue-500" />
                <h3 className="font-semibold text-gray-900">2. Approve & Assign</h3>
              </div>
              <p className="text-gray-600">Maintenance managers approve and send the job to the best contractor.</p>
            </div>
            <div className="bg-gray-50 p-6 rounded-lg shadow-sm hover-scale">
              <div className="flex items-center gap-3 mb-3">
                <Wrench className="h-6 w-6 text-blue-500" />
                <h3 className="font-semibold text-gray-900">3. Work Completed</h3>
              </div>
              <p className="text-gray-600">Contractor uploads photos and an invoice once done.</p>
            </div>
            <div className="bg-gray-50 p-6 rounded-lg shadow-sm hover-scale">
              <div className="flex items-center gap-3 mb-3">
                <BarChart3 className="h-6 w-6 text-blue-500" />
                <h3 className="font-semibold text-gray-900">4. Review & Export</h3>
              </div>
              <p className="text-gray-600">Manager approves or requests changes; invoices can be bulk-downloaded or exported for landlords.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Security & compliance - COMMENTED OUT
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
                  <div className="text-2xl font-bold text-gray-900">Australia</div>
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
      */}

      {/* Pricing */}
      <section id="pricing" className="py-16 bg-white animate-fade-in">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900">Simple pricing</h2>
            <p className="text-gray-600">Free 30-day trial. No credit card required.</p>
          </div>
          <div className="flex justify-center">
            <div className="max-w-md w-full border rounded-lg p-8 bg-gray-50 hover-scale shadow-sm">
              <div className="text-center mb-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Starter</h3>
                <div className="text-gray-900">
                  <span className="text-4xl font-bold">A$29</span>
                  <span className="text-lg font-normal text-gray-600"> / property / month</span>
                </div>
              </div>
              <ul className="space-y-3 text-gray-700 mb-8">
                <li className="flex items-center gap-3"><CheckCircle2 className="h-5 w-5 text-blue-500 flex-shrink-0" /> Unlimited requests</li>
                <li className="flex items-center gap-3"><CheckCircle2 className="h-5 w-5 text-blue-500 flex-shrink-0" /> Contractor portal</li>
                <li className="flex items-center gap-3"><CheckCircle2 className="h-5 w-5 text-blue-500 flex-shrink-0" /> Unlimited Team access</li>
              </ul>
              <Button className="w-full" onClick={() => navigate('/signup')}>Start free trial</Button>
            </div>
          </div>
          <p className="text-sm text-gray-500 mt-6 text-center">
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
              quote="HousingHub lets our support staff raise issues quickly and our contractors know exactly what to do."
              author="Operations Lead, Supported Living Provider"
              rating={5}
            />
            <TestimonialCard
              quote="Property management has never been so easy since using Housing hub."
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
              <AccordionContent>Yes—start your 30-day free trial without a card.</AccordionContent>
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
              <h3 className="text-lg font-semibold mb-4">HousingHub</h3>
              <p className="text-gray-300">
                Simplifying maintenance management for facilities of all sizes.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4">Quick Links</h3>
               <ul className="space-y-2">
                 <li><a href="#features" className="text-gray-300 hover:text-white">Features</a></li>
                 <li><Link to="/signup" className="text-gray-300 hover:text-white">Start free trial</Link></li>
                 <li><Link to="/login" className="text-gray-300 hover:text-white">Sign in</Link></li>
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
            <p>&copy; 2025 HousingHub. All rights reserved.</p>
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

function TestimonialCard({ quote, author, rating = 5 }: { quote: string; author: string; rating?: number }) {
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
}

export default Index;
