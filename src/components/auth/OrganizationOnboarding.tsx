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

  const generateUniqueSlug = async (baseName: string): Promise<string> => {
    const baseSlug = generateSlug(baseName);
    let slug = baseSlug;
    let counter = 1;

    // Check if slug exists and keep incrementing until we find a unique one
    while (true) {
      const { data: existing, error } = await supabase
        .from('organizations')
        .select('slug')
        .eq('slug', slug)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error checking slug availability:', error);
        throw error;
      }

      if (!existing) {
        return slug; // This slug is available
      }

      // Try next variation
      slug = `${baseSlug}-${counter}`;
      counter++;

      // Safety limit to prevent infinite loops
      if (counter > 100) {
        // Fallback with timestamp
        slug = `${baseSlug}-${Date.now()}`;
        break;
      }
    }

    return slug;
  };

  const handleOrgNameChange = (value: string) => {
    setOrgName(value);
    if (value.trim()) {
      // Generate basic slug immediately for UI feedback
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
      setError(null); // Clear any previous errors
      console.log('Creating organization:', { orgName, orgSlug, userId: user.id });

      // Generate final unique slug before creation
      const finalSlug = await generateUniqueSlug(orgName.trim());

      // Create the organization
      const { data: orgData, error: orgError } = await supabase
        .from('organizations')
        .insert({
          name: orgName.trim(),
          slug: finalSlug,
          created_by: user.id,
          settings: {}
        })
        .select()
        .single();

      console.log('Organization creation result:', { orgData, orgError });

      if (orgError) {
        console.error('Organization creation error:', orgError);
        let errorMessage = 'Failed to create organization. ';
        
        if (orgError.code === '23505') {
          errorMessage += 'Organization name already exists. Please try a different name.';
        } else if (orgError.message?.includes('permission denied')) {
          errorMessage += 'Permission denied. Please refresh the page and try again.';
        } else if (orgError.message?.includes('violates row-level security')) {
          errorMessage += 'Authentication error. Please sign out and sign in again.';
        } else if (orgError.message?.includes('JWT')) {
          errorMessage += 'Session expired. Please refresh the page and try again.';
        } else {
          errorMessage += orgError.message || 'Unknown error occurred.';
        }
        
        setError(errorMessage);
        return;
      }

      console.log('Organization created:', orgData);

      // Update user's profile with organization_id, session organization, and admin role  
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ 
          organization_id: orgData.id,
          session_organization_id: orgData.id,
          role: 'admin'
        })
        .eq('id', user.id);

      console.log('Profile update result:', { profileError });

      if (profileError) {
        console.error('Error updating user profile:', profileError);
        if (profileError.message?.includes('violates row-level security')) {
          setError("Failed to update user profile. Please try signing out and back in.");
        } else {
          setError(`Failed to update profile: ${profileError.message}`);
        }
        return;
      }

      console.log('User profile updated with organization info and admin role');

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
        
        // Even if user_organizations creation failed, try to fix the profile role
        try {
          const { error: roleFixError } = await supabase
            .from('profiles')
            .update({ role: 'admin' })
            .eq('id', user.id);
          
          if (roleFixError) {
            console.error('Failed to set admin role in profile:', roleFixError);
          } else {
            console.log('Successfully set admin role in profile as fallback');
          }
        } catch (fixError) {
          console.error('Exception while fixing role:', fixError);
        }
        
        toast.success("Organization created successfully!");
        console.log('Calling onComplete despite user organization membership error');
      } else {
        console.log('User organization membership created:', userOrgData);
        toast.success("Organization created successfully!");
        
        console.log('Calling onComplete to refresh organization context');
      }

      // Force a user metadata update to trigger auth state change
      try {
        const { error: updateError } = await supabase.auth.updateUser({
          data: { last_organization_update: Date.now() }
        });

        if (updateError) {
          console.warn('Failed to update user metadata:', updateError);
        }
      } catch (metaError) {
        console.warn('Error updating user metadata:', metaError);
      }

      // Always call onComplete to refresh
      onComplete();
    } catch (error: any) {
      console.error('Error creating organization:', error);
      setError(error.message || "Failed to create organization");
      toast.error(`Failed to create organization: ${error.message || "Unknown error"}`);
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
                    onChange={(e) => {
                      const value = e.target.value;
                      setOrgName(value);
                      // Use a simple slug generation for immediate feedback
                      if (value.trim()) {
                        setOrgSlug(generateSlug(value));
                      } else {
                        setOrgSlug('');
                      }
                    }}
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