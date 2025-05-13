import React from 'react';
import { Button } from "@/components/ui/button";
import { useUserContext } from '@/contexts/UserContext';
import { useNavigate } from 'react-router-dom';

const Index = () => {
  const { currentUser } = useUserContext();
  const navigate = useNavigate();
  
  return (
    <div className="flex flex-col min-h-screen">
      <header className="bg-white border-b">
        <div className="container flex h-16 items-center justify-between py-4">
          <a className="mr-4 flex items-center space-x-2" href="#">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-6 w-6"
            >
              <path d="M15 6v12a3 3 0 1 1-6 0V6a3 3 0 1 1 6 0z" />
            </svg>
            <span className="font-bold">MaintenanceHub</span>
          </a>
          <nav className="flex items-center space-x-6 text-sm font-medium">
            <a href="#" className="hover:underline">
              Features
            </a>
            <a href="#" className="hover:underline">
              Pricing
            </a>
            <a href="#" className="hover:underline">
              Docs
            </a>
          </nav>
        </div>
      </header>
      
      <main className="flex-1 flex flex-col justify-center items-center p-8">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl">
            Streamline Your Property Maintenance
          </h1>
          <p className="scroll-m-20 mt-4 text-gray-500 md:text-lg">
            Manage maintenance requests, track expenses, and stay organized with our
            intuitive platform.
          </p>
          
          <div className="mt-8 flex flex-col sm:flex-row justify-center gap-4">
            <Button size="lg" asChild>
              <a href="/login">Sign In</a>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <a href="/signup">Create Account</a>
            </Button>
          </div>
        </div>
      </main>
      
      <footer className="bg-gray-100 py-12 border-t">
        <div className="container flex flex-col items-center justify-between gap-4 md:h-24 md:flex-row">
          <div className="flex flex-col items-center gap-2 px-8 md:flex-row">
            <a className="mr-4 flex items-center space-x-2" href="#">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-6 w-6"
              >
                <path d="M15 6v12a3 3 0 1 1-6 0V6a3 3 0 1 1 6 0z" />
              </svg>
              <span className="font-bold">MaintenanceHub</span>
            </a>
            <p className="text-sm text-gray-500">
              © 2024 MaintenanceHub. All rights reserved.
            </p>
          </div>
          <nav className="flex flex-wrap items-center space-x-4 text-sm font-medium">
            <a href="#" className="hover:underline">
              Terms of Service
            </a>
            <a href="#" className="hover:underline">
              Privacy Policy
            </a>
          </nav>
        </div>
      </footer>
    </div>
  );
};

export default Index;
