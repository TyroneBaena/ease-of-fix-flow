
import React from 'react';
import { Button } from "@/components/ui/button";
import { useNavigate } from 'react-router-dom';
import { Wrench, ClipboardList, BarChart3, UserCircle } from 'lucide-react';

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <h1 className="text-3xl font-bold text-gray-900">MaintenanceHub</h1>
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

      {/* Hero Section */}
      <section className="py-12 bg-gradient-to-br from-blue-500 to-teal-400 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="md:flex md:items-center md:justify-between">
            <div className="md:w-1/2">
              <h2 className="text-4xl font-bold mb-4">Simplify Your Maintenance Operations</h2>
              <p className="text-xl mb-8">
                Track, manage, and resolve maintenance requests efficiently with our comprehensive platform.
              </p>
              <div className="flex flex-wrap gap-4">
                <Button 
                  onClick={() => navigate('/new-request')}
                  className="bg-white text-blue-600 hover:bg-gray-100"
                >
                  Submit New Request
                </Button>
                <Button 
                  onClick={() => navigate('/dashboard')}
                  className="bg-white text-blue-600 hover:bg-gray-100"
                >
                  View Dashboard
                </Button>
              </div>
            </div>
            <div className="hidden md:block md:w-1/2">
              <div className="relative h-64 w-full">
                <img 
                  src="https://images.unsplash.com/photo-1504148455328-c376907d081c?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80"
                  alt="Home maintenance tools and equipment"
                  className="absolute inset-0 w-full h-full object-cover rounded-lg shadow-lg"
                />
                <div className="absolute inset-0 bg-white/10 backdrop-blur-sm rounded-lg shadow-lg transform rotate-3"></div>
                <div className="absolute inset-0 bg-white/10 backdrop-blur-sm rounded-lg shadow-lg -rotate-2"></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center mb-12 text-gray-900">
            Why Choose MaintenanceHub?
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
          <h2 className="text-3xl font-bold mb-4 text-gray-900">Ready to Get Started?</h2>
          <p className="text-xl mb-8 text-gray-600">
            Join thousands of facilities using MaintenanceHub to streamline their maintenance operations.
          </p>
          <div className="flex justify-center gap-4">
            <Button 
              onClick={() => navigate('/new-request')}
              size="lg"
              className="bg-blue-500 hover:bg-blue-600"
            >
              Submit a Request
            </Button>
            <Button 
              onClick={() => navigate('/dashboard')}
              variant="outline"
              size="lg"
              className="border-blue-500 text-blue-500 hover:bg-blue-500 hover:text-white"
            >
              Explore Dashboard
            </Button>
          </div>
        </div>
      </section>

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
                <li><a href="/new-request" className="text-gray-300 hover:text-white">New Request</a></li>
                <li><a href="/dashboard" className="text-gray-300 hover:text-white">Dashboard</a></li>
                <li><a href="/analytics" className="text-gray-300 hover:text-white">Analytics</a></li>
                <li><a href="/signup" className="text-gray-300 hover:text-white">Create Account</a></li>
                <li><a href="/login" className="text-gray-300 hover:text-white">Login</a></li>
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
