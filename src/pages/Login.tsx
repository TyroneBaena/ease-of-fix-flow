import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { signIn } = useSupabaseAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast.error("Please enter both email and password");
      return;
    }
    
    try {
      setIsLoading(true);
      await signIn(email, password);
      navigate('/dashboard');
    } catch (error) {
      console.error('Login error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    try {
      setIsLoading(true);
      // Use a valid email format that will pass Supabase validation
      const demoEmail = "demo-user@example.com";
      const demoPassword = "password123";
      
      console.log("Attempting demo login...");
      
      // First try to sign in directly - if the user already exists
      try {
        await signIn(demoEmail, demoPassword);
        toast.success("Signed in as demo admin");
        navigate('/dashboard');
        return;
      } catch (signInError) {
        console.log("Demo user doesn't exist yet, creating...");
      }
      
      // If sign-in failed, try to create the user
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: demoEmail,
        password: demoPassword,
        options: {
          data: {
            name: 'Demo Admin',
            role: 'admin'
          }
        }
      });
      
      if (signUpError) {
        console.error("Error creating demo user:", signUpError);
        toast.error("Failed to create demo account: " + signUpError.message);
        return;
      }
      
      // Create user profile manually since we might not have a trigger
      if (data.user) {
        // Convert UUID string to number for database insert
        const numericId = parseInt(data.user.id, 10) || 0; // Fallback to 0 if parsing fails
        
        const { error: profileError } = await supabase
          .from('user_profiles')
          .insert({
            id: numericId,
            Name: 'Demo Admin',
            email: demoEmail,
            role: 'admin',
            created_at: new Date().toISOString()
          });
          
        if (profileError) {
          console.error("Error creating demo profile:", profileError);
          toast.error("Failed to create demo profile");
          return;
        }
      }
      
      // Now try to sign in with the newly created account
      await signIn(demoEmail, demoPassword);
      toast.success("Signed in as demo admin");
      navigate('/dashboard');
    } catch (error) {
      console.error('Demo login error:', error);
      toast.error("Failed to login with demo account");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <div className="h-12 w-12 rounded-md bg-blue-500 flex items-center justify-center">
              <span className="text-white text-2xl font-bold">M</span>
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">Sign in to MaintenanceHub</CardTitle>
          <p className="text-sm text-gray-500">
            Enter your email and password to access your account
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">Email</label>
              <Input 
                id="email" 
                type="email" 
                placeholder="name@example.com" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required 
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label htmlFor="password" className="text-sm font-medium">Password</label>
                <a href="#" className="text-sm text-blue-500 hover:underline">
                  Forgot password?
                </a>
              </div>
              <Input 
                id="password" 
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)} 
                required 
              />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Signing in..." : "Sign In"}
            </Button>
            
            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">Or</span>
              </div>
            </div>
            
            <Button 
              type="button" 
              variant="outline" 
              className="w-full" 
              onClick={handleDemoLogin}
              disabled={isLoading}
            >
              Demo Login (No Password Required)
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;
