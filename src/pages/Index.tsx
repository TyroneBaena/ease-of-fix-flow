
import React, { useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { useNavigate } from 'react-router-dom';
import { Wrench, ClipboardList, BarChart3, UserCircle } from 'lucide-react';

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

      {/* CTA Section */}
      <section className="py-16 bg-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold mb-4 text-gray-900">Start your 30-day free trial</h2>
          <p className="text-xl mb-8 text-gray-600">
            App built specifically for Supported Accommodation providers.
          </p>
          <div className="flex justify-center gap-4">
            <Button 
              onClick={() => navigate('/signup')}
              size="lg"
              className="bg-blue-500 hover:bg-blue-600"
            >
              Get started free
            </Button>
            <Button 
              onClick={() => navigate('/login')}
              variant="outline"
              size="lg"
              className="border-blue-500 text-blue-500 hover:bg-blue-500 hover:text-white"
            >
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
    <div className="bg-white p-6 rounded-lg shadow-md transition-all hover:shadow-lg">
      <div className="flex justify-center mb-4">
        {icon}
      </div>
      <h3 className="text-xl font-semibold mb-3 text-gray-900 text-center">{title}</h3>
      <p className="text-gray-600 text-center">{description}</p>
    </div>
  );
};

export default Index;
