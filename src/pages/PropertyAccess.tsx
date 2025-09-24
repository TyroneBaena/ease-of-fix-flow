import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Clock, User, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface TemporarySession {
  sessionToken: string;
  propertyId: string;
  propertyName: string;
  organizationId: string;
  expiresAt: string;
}

interface MaintenanceRequest {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  location: string;
  created_at: string;
  category: string;
}

const PropertyAccess = () => {
  const { propertyId } = useParams<{ propertyId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<TemporarySession | null>(null);
  const [requests, setRequests] = useState<MaintenanceRequest[]>([]);
  const [showClaimDialog, setShowClaimDialog] = useState(false);

  useEffect(() => {
    const validateSession = () => {
      const storedSession = localStorage.getItem('temporarySession');
      if (!storedSession) {
        toast({
          title: "Session Expired",
          description: "Please scan the QR code again to access this property.",
          variant: "destructive"
        });
        navigate('/login');
        return;
      }

      const sessionData: TemporarySession = JSON.parse(storedSession);
      
      // Check if session matches property ID
      if (sessionData.propertyId !== propertyId) {
        toast({
          title: "Access Denied",
          description: "This session is not valid for this property.",
          variant: "destructive"
        });
        navigate('/login');
        return;
      }

      // Check if session is expired
      if (new Date(sessionData.expiresAt) < new Date()) {
        localStorage.removeItem('temporarySession');
        toast({
          title: "Session Expired",
          description: "Your temporary access has expired. Please scan the QR code again.",
          variant: "destructive"
        });
        navigate('/login');
        return;
      }

      setSession(sessionData);
      fetchMaintenanceRequests(sessionData);
    };

    validateSession();
  }, [propertyId, navigate, toast]);

  const fetchMaintenanceRequests = async (sessionData: TemporarySession) => {
    try {
      // Note: This would need to be modified to work with temporary sessions
      // For now, we'll show a placeholder
      setRequests([]);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching maintenance requests:', error);
      toast({
        title: "Error",
        description: "Failed to load maintenance requests.",
        variant: "destructive"
      });
      setLoading(false);
    }
  };

  const formatTimeRemaining = (expiresAt: string) => {
    const now = new Date();
    const expiry = new Date(expiresAt);
    const diffMs = expiry.getTime() - now.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (diffHours > 0) {
      return `${diffHours}h ${diffMinutes}m remaining`;
    }
    return `${diffMinutes}m remaining`;
  };

  const handleClaimAccount = () => {
    setShowClaimDialog(true);
  };

  const handleNewRequest = () => {
    navigate(`/new-request?propertyId=${propertyId}&temporary=true`);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">{session.propertyName}</h1>
              <p className="text-muted-foreground">Temporary Access</p>
            </div>
            <div className="flex items-center gap-4">
              <Badge variant="outline" className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                {formatTimeRemaining(session.expiresAt)}
              </Badge>
              <Button onClick={handleClaimAccount} variant="outline">
                <User className="h-4 w-4 mr-2" />
                Claim Account
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="grid gap-6">
          {/* Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>
                What would you like to do for {session.propertyName}?
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <Button onClick={handleNewRequest} className="h-16">
                  <div className="text-center">
                    <div className="font-semibold">Submit Maintenance Request</div>
                    <div className="text-sm opacity-80">Report an issue or request maintenance</div>
                  </div>
                </Button>
                <Button variant="outline" className="h-16" disabled>
                  <div className="text-center">
                    <div className="font-semibold">View Previous Requests</div>
                    <div className="text-sm opacity-60">Requires permanent account</div>
                  </div>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Info */}
          <Card>
            <CardHeader>
              <CardTitle>Temporary Access Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3 p-4 bg-muted rounded-lg">
                <Clock className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="font-medium">Time Limited Access</p>
                  <p className="text-sm text-muted-foreground">
                    Your access expires in {formatTimeRemaining(session.expiresAt)}. 
                    You can submit maintenance requests during this time.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <Mail className="h-5 w-5 text-blue-600 mt-0.5" />
                <div>
                  <p className="font-medium text-blue-900 dark:text-blue-100">Want to Keep Your Data?</p>
                  <p className="text-sm text-blue-700 dark:text-blue-200">
                    Create a permanent account to save your maintenance requests and get access to additional features.
                  </p>
                  <Button 
                    onClick={handleClaimAccount} 
                    variant="outline" 
                    size="sm" 
                    className="mt-2 border-blue-300 text-blue-700 hover:bg-blue-100 dark:border-blue-600 dark:text-blue-200"
                  >
                    Create Account
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default PropertyAccess;