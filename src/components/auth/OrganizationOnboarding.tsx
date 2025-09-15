import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building2, Users, AlertCircle, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface OrganizationOnboardingProps {
  user: any;
  onComplete: () => void;
}

export const OrganizationOnboarding: React.FC<OrganizationOnboardingProps> = ({ user, onComplete }) => {
  const [activeTab, setActiveTab] = useState<'create' | 'join'>('create');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Create organization form
  const [orgName, setOrgName] = useState('');
  const [orgSlug, setOrgSlug] = useState('');
  
  // Join organization form
  const [inviteCode, setInviteCode] = useState('');

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, ''); // Remove leading and trailing dashes
  };

  const handleOrgNameChange = (value: string) => {
    setOrgName(value);
    if (value.trim()) {
      setOrgSlug(generateSlug(value));
    } else {
      setOrgSlug('');
    }
  };

  const handleCreateOrganization = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!orgName.trim()) {
      setError("Organization name is required");
      return;
    }

    if (!orgSlug.trim()) {
      setError("Organization slug is required");
      return;
    }

    if (!user?.id) {
      setError("User authentication error. Please sign in again.");
      return;
    }

    try {
      setIsLoading(true);
      console.log('Creating organization:', { orgName, orgSlug, userId: user.id });

      // Create the organization directly without the debug call
      const { data: orgData, error: orgError } = await supabase
        .from('organizations')
        .insert({
          name: orgName.trim(),
          slug: orgSlug.trim(),
          created_by: user.id,
          settings: {}
        })
        .select()
        .single();

      console.log('Organization creation result:', { orgData, orgError });

      if (orgError) {
        console.error('Organization creation error:', orgError);
        if (orgError.code === '23505') {
          setError("Organization name or identifier already exists. Please choose a different name.");
        } else if (orgError.message?.includes('permission denied')) {
          setError("Permission denied. Please make sure you're logged in and try again.");
        } else if (orgError.message?.includes('violates row-level security')) {
          setError("Authentication error. Please sign out and sign in again.");
        } else {
          setError(`Failed to create organization: ${orgError.message}`);
        }
        return;
      }

      console.log('Organization created:', orgData);

      // Update user's profile with organization_id and session organization
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ 
          organization_id: orgData.id,
          session_organization_id: orgData.id
        })
        .eq('id', user.id);

      if (profileError) {
        console.error('Error updating user profile:', profileError);
        if (profileError.message?.includes('violates row-level security')) {
          setError("Failed to update user profile. Please try signing out and back in.");
        } else {
          setError(`Failed to update profile: ${profileError.message}`);
        }
        return;
      }

      console.log('User profile updated with organization info');

      // Create user_organizations record for the new organization
      const { data: userOrgData, error: userOrgError } = await supabase
        .from('user_organizations')
        .insert({
          user_id: user.id,
          organization_id: orgData.id,
          role: 'admin',
          is_active: true,
          is_default: true
        })
        .select()
        .single();

      if (userOrgError) {
        console.error('Error creating user organization record:', userOrgError);
        toast.error('Organization created but failed to set up membership. Please contact support.');
        // Don't throw here as the main setup is complete
      } else {
        console.log('User organization membership created:', userOrgData);
      }

      toast.success("Organization created successfully!");
      
      // Force a reload to refresh all contexts and ensure proper organization access
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error: any) {
      console.error('Error creating organization:', error);
      setError(error.message || "Failed to create organization");
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoinOrganization = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!inviteCode.trim()) {
      setError("Invite code is required");
      return;
    }

    try {
      setIsLoading(true);
      console.log('Joining organization with code:', inviteCode);

      // For now, show a message that this feature will be available later
      setError("Organization invitation system will be available in a future update. Please create your own organization for now.");
    } catch (error: any) {
      console.error('Error joining organization:', error);
      setError(error.message || "Failed to join organization");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="h-12 w-12 rounded-md bg-blue-500 flex items-center justify-center">
              <Building2 className="h-6 w-6 text-white" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">Complete Your Setup</CardTitle>
          <p className="text-sm text-muted-foreground">
            You need to create or join an organization to continue
          </p>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert className="mb-4 border-red-200 bg-red-50 text-red-800">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'create' | 'join')}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="create">Create Organization</TabsTrigger>
              <TabsTrigger value="join">Join Organization</TabsTrigger>
            </TabsList>

            <TabsContent value="create" className="space-y-4">
              <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-md">
                <CheckCircle className="h-4 w-4 text-blue-600" />
                <span className="text-sm text-blue-800">You'll become the admin of this organization</span>
              </div>

              <form onSubmit={handleCreateOrganization} className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="orgName" className="text-sm font-medium">
                    Organization Name
                  </label>
                  <Input
                    id="orgName"
                    value={orgName}
                    onChange={(e) => handleOrgNameChange(e.target.value)}
                    placeholder="Acme Property Management"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="orgSlug" className="text-sm font-medium">
                    Organization Identifier
                  </label>
                  <Input
                    id="orgSlug"
                    value={orgSlug}
                    onChange={(e) => setOrgSlug(e.target.value)}
                    placeholder="acme-property-management"
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    This will be used in URLs and must be unique
                  </p>
                </div>

                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? "Creating..." : "Create Organization"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="join" className="space-y-4">
              <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-md">
                <Users className="h-4 w-4 text-amber-600" />
                <span className="text-sm text-amber-800">You'll join as a team member</span>
              </div>

              <form onSubmit={handleJoinOrganization} className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="inviteCode" className="text-sm font-medium">
                    Invitation Code
                  </label>
                  <Input
                    id="inviteCode"
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value)}
                    placeholder="Enter invitation code"
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Enter the code provided by your organization admin
                  </p>
                </div>

                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? "Joining..." : "Join Organization"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};