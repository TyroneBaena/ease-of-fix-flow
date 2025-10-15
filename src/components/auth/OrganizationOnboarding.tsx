import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Building2, AlertCircle, CheckCircle, Users, Mail, Key, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { PaymentMethodSetup } from './PaymentMethodSetup';
import { invitationCodeService } from '@/services/invitationCodeService';
import { useSimpleAuth } from '@/contexts/UnifiedAuthContext';

interface OrganizationOnboardingProps {
  user: any;
  onComplete: () => void;
  initialInvitationCode?: string;
}

export const OrganizationOnboarding: React.FC<OrganizationOnboardingProps> = ({ user, onComplete, initialInvitationCode }) => {
  const navigate = useNavigate();
  const { refreshUser } = useSimpleAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPaymentSetup, setShowPaymentSetup] = useState(false);
  
  // Create organization form
  const [orgName, setOrgName] = useState('');
  const [orgSlug, setOrgSlug] = useState('');
  
  // Join organization with invitation code
  const [invitationCode, setInvitationCode] = useState(initialInvitationCode || '');
  const [joiningOrg, setJoiningOrg] = useState(false);
  const [showLoginReminder, setShowLoginReminder] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

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

      // Show payment setup - don't call onComplete yet
      // onComplete will be called after payment setup is done or skipped
      setShowPaymentSetup(true);
    } catch (error: any) {
      console.error('Error creating organization:', error);
      setError(error.message || "Failed to create organization");
      toast.error(`Failed to create organization: ${error.message || "Unknown error"}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoinWithCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!invitationCode.trim()) {
      setError("Invitation code is required");
      return;
    }

    if (!user?.id) {
      setError("User authentication error. Please sign in again.");
      return;
    }

    setJoiningOrg(true);
    
    try {
      // Verify active Supabase session before proceeding
      console.log('🔐 Verifying Supabase session...');
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        console.error('❌ No active session found:', sessionError);
        setError("Your session has expired. Please log in again to join an organization.");
        toast.error("Session expired. Please log in again.");
        setJoiningOrg(false);
        
        // Redirect to login after a short delay
        setTimeout(() => {
          navigate('/login', { 
            state: { 
              message: 'Please log in to join your organization',
              invitationCode: invitationCode.trim().toUpperCase()
            } 
          });
        }, 2000);
        return;
      }

      console.log('✅ Active session verified');
      console.log('Joining organization with code:', invitationCode.trim().toUpperCase());

      // Add timeout wrapper to prevent hanging (increased to 30 seconds for edge function)
      const joinPromise = invitationCodeService.useCode(
        invitationCode.trim().toUpperCase()
      );
      
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Join organization request timed out. Please try again.')), 30000);
      });

      const { success, organization_id, assigned_role, error: joinError } = await Promise.race([
        joinPromise,
        timeoutPromise
      ]).catch((err) => {
        console.error('Join operation failed:', err);
        return { success: false, organization_id: null, assigned_role: null, error: err };
      }) as any;

      if (!success || joinError) {
        const errorMessage = joinError?.message || "Failed to join organization";
        console.error('Join failed:', errorMessage);
        setError(errorMessage);
        toast.error(errorMessage);
        setJoiningOrg(false);
        return;
      }

      console.log('Successfully joined organization:', { organization_id, assigned_role });
      
      // VERIFY the role in the database immediately
      console.log('🔍 Verifying role assignment in database...');
      const { data: verifyProfile, error: verifyError } = await supabase
        .from('profiles')
        .select('role, organization_id')
        .eq('id', user.id)
        .single();
      
      if (verifyError) {
        console.error('❌ Failed to verify role:', verifyError);
        setError('Failed to verify role assignment. Please refresh the page.');
        toast.error('Failed to verify role assignment');
        setJoiningOrg(false);
        return;
      }
      
      console.log('📋 Verified profile data:', verifyProfile);
      
      if (verifyProfile.role !== assigned_role) {
        console.error('❌ ROLE MISMATCH!', {
          expected: assigned_role,
          actual: verifyProfile.role
        });
        setError(`Role mismatch detected. Expected: ${assigned_role}, Got: ${verifyProfile.role}`);
        toast.error('Role assignment error. Please contact support.');
        setJoiningOrg(false);
        return;
      }
      
      console.log('✅ Role verified successfully:', verifyProfile.role);
      toast.success(`Successfully joined organization as ${assigned_role}!`);

      // Force auth context to refetch organizations after successful join
      // Wait a moment for database propagation
      console.log('⏳ Waiting for database propagation...');
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Trigger a full user data refresh by updating metadata
      console.log('🔄 Triggering user data refresh...');
      await supabase.auth.refreshSession();

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

      // Immediately update state to enable button
      setJoiningOrg(false);
      
      // Show login reminder dialog with user's email
      setUserEmail(user.email || '');
      setShowLoginReminder(true);
    } catch (error: any) {
      console.error('🚨 CRITICAL: Error joining organization:', error);
      const errorMsg = error.message || "Failed to join organization";
      setError(errorMsg);
      toast.error(`Failed to join organization: ${errorMsg}`);
      setJoiningOrg(false);
    } finally {
      // Safety net: ensure button is always re-enabled
      console.log('🔄 Join flow complete, ensuring button is enabled');
      setJoiningOrg(false);
    }
  };

  // Show payment setup after organization creation
  if (showPaymentSetup) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <PaymentMethodSetup
          onComplete={() => {
            toast.success('Free trial activated!');
            onComplete(); // Call parent's onComplete after payment setup
            navigate('/dashboard', { replace: true });
          }}
        />
      </div>
    );
  }

  return (
    <>
      {/* Login Reminder Dialog - Only shown after joining via invitation code */}
      <Dialog open={showLoginReminder} onOpenChange={setShowLoginReminder}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Successfully Joined Organization!
            </DialogTitle>
            <DialogDescription className="space-y-4 pt-4">
              <p>You can now access the platform. Here are your login credentials for future reference:</p>
              
              <div className="space-y-3 bg-muted p-4 rounded-lg">
                <div className="flex items-start gap-3">
                  <Mail className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div className="flex-1 space-y-1">
                    <p className="text-xs font-medium text-muted-foreground">Email Address</p>
                    <p className="font-mono text-sm break-all">{userEmail}</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <Key className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div className="flex-1 space-y-1">
                    <p className="text-xs font-medium text-muted-foreground">Password</p>
                    <p className="text-sm">The password you set during registration</p>
                  </div>
                </div>
              </div>

              <Alert className="border-blue-200 bg-blue-50">
                <AlertDescription className="text-sm text-blue-800">
                  💡 Tip: Save these credentials securely. You'll need them to login next time.
                </AlertDescription>
              </Alert>
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex justify-end gap-2 pt-4">
            <Button
              onClick={async () => {
                setIsRefreshing(true);
                setShowLoginReminder(false);
                
                try {
                  console.log('🔄 Starting post-join refresh...');
                  
                  // Edge function has already updated everything, just need to route correctly
                  // Give database a moment to propagate (edge function is fast but propagation takes time)
                  await new Promise(resolve => setTimeout(resolve, 1000));
                  
                  // Get fresh user data to determine dashboard
                  const { data: { user: updatedUser } } = await supabase.auth.getUser();
                  if (!updatedUser) {
                    console.error('No user found after refresh');
                    navigate('/dashboard', { replace: true });
                    return;
                  }
                  
                  const { data: profile } = await supabase
                    .from('profiles')
                    .select('role, organization_id')
                    .eq('id', updatedUser.id)
                    .single();
                  
                  console.log('📋 User profile after join:', profile);
                  
                  let targetPath = '/dashboard';
                  
                  // Route to contractor dashboard ONLY if:
                  // 1. User has contractor role
                  // 2. User has a contractor profile in contractors table
                  if (profile?.role === 'contractor') {
                    console.log('👷 User has contractor role, checking for contractor profile...');
                    
                    // Retry logic with exponential backoff for contractor profile
                    let contractorProfile = null;
                    let attempts = 0;
                    const maxAttempts = 3;
                    
                    while (!contractorProfile && attempts < maxAttempts) {
                      attempts++;
                      console.log(`👷 Contractor profile check attempt ${attempts}/${maxAttempts}`);
                      
                      const { data, error: contractorError } = await supabase
                        .from('contractors')
                        .select('id')
                        .eq('user_id', updatedUser.id)
                        .maybeSingle();
                      
                      if (contractorError) {
                        console.error(`❌ Attempt ${attempts} - Error checking contractor profile:`, contractorError);
                      } else if (data) {
                        contractorProfile = data;
                        console.log(`✅ Attempt ${attempts} - Contractor profile found:`, data.id);
                      } else {
                        console.warn(`⚠️ Attempt ${attempts} - Contractor profile not found yet`);
                        if (attempts < maxAttempts) {
                          await new Promise(resolve => setTimeout(resolve, 1000 * attempts)); // Exponential backoff
                        }
                      }
                    }
                    
                    if (contractorProfile) {
                      targetPath = '/contractor-dashboard';
                      console.log('🎯 Routing to contractor dashboard');
                    } else {
                      console.error('❌ CRITICAL: Contractor profile not found after all attempts');
                      toast.error('Failed to create contractor profile. Redirecting to main dashboard...');
                      // Fallback to regular dashboard
                      targetPath = '/dashboard';
                    }
                  } else if (profile?.role === 'admin') {
                    console.log('👑 User has admin role, routing to admin dashboard');
                    targetPath = '/dashboard';
                  } else if (profile?.role === 'manager') {
                    console.log('📊 User has manager role, routing to manager dashboard');
                    targetPath = '/dashboard';
                  } else {
                    console.warn('⚠️ Unknown role, defaulting to dashboard:', profile?.role);
                    targetPath = '/dashboard';
                  }
                  
                  // Small delay before navigation to ensure state is synced
                  await new Promise(resolve => setTimeout(resolve, 500));
                  
                  console.log(`🚀 Final navigation to: ${targetPath}`);
                  navigate(targetPath, { replace: true });
                  onComplete();
                } catch (refreshError) {
                  console.error('Error during refresh:', refreshError);
                  toast.error('Navigation error. Please refresh the page.');
                  navigate('/dashboard', { replace: true });
                  onComplete();
                } finally {
                  setIsRefreshing(false);
                }
              }}
              disabled={isRefreshing}
            >
              {isRefreshing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Setting up...
                </>
              ) : (
                'Continue to Dashboard'
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <Card className="w-full max-w-2xl mx-4 shadow-lg">
          <CardHeader className="space-y-1 text-center pb-4">
            <div className="flex justify-center mb-4">
              <div className="rounded-full bg-primary/10 p-3">
                <Building2 className="h-8 w-8 text-primary" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold">Complete Your Setup</CardTitle>
            <p className="text-muted-foreground">
              Create a new organization or join an existing one to get started
            </p>
          </CardHeader>

          <CardContent>
            {error && (
              <Alert variant="destructive" className="mb-6">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Tabs defaultValue={initialInvitationCode ? "join" : "create"} className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="create" className="gap-2">
                  <Building2 className="h-4 w-4" />
                  Create Organization
                </TabsTrigger>
                <TabsTrigger value="join" className="gap-2">
                  <Users className="h-4 w-4" />
                  Join Organization
                </TabsTrigger>
              </TabsList>

              <TabsContent value="create" className="space-y-4">
                <form onSubmit={handleCreateOrganization} className="space-y-4">
                  <div className="space-y-2">
                    <label htmlFor="orgName" className="text-sm font-medium">
                      Organization Name <span className="text-destructive">*</span>
                    </label>
                    <Input
                      id="orgName"
                      placeholder="Acme Corp"
                      value={orgName}
                      onChange={(e) => {
                        setOrgName(e.target.value);
                        setOrgSlug(generateSlug(e.target.value));
                      }}
                      disabled={isLoading}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="orgSlug" className="text-sm font-medium">
                      Organization URL Slug <span className="text-destructive">*</span>
                    </label>
                    <Input
                      id="orgSlug"
                      placeholder="acme-corp"
                      value={orgSlug}
                      onChange={(e) => setOrgSlug(generateSlug(e.target.value))}
                      disabled={isLoading}
                      required
                    />
                    <p className="text-xs text-muted-foreground">
                      This will be used in your organization's URL
                    </p>
                  </div>

                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating Organization...
                      </>
                    ) : (
                      'Create Organization'
                    )}
                  </Button>
                </form>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">
                      What happens next?
                    </span>
                  </div>
                </div>

                <div className="space-y-2 text-sm text-muted-foreground">
                  <p className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>You'll become the organization admin with full access</span>
                  </p>
                  <p className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>Start with a free trial period</span>
                  </p>
                  <p className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>Invite team members to join your organization</span>
                  </p>
                </div>
              </TabsContent>

              <TabsContent value="join" className="space-y-4">
                <form onSubmit={handleJoinWithCode} className="space-y-4">
                  <div className="space-y-2">
                    <label htmlFor="inviteCode" className="text-sm font-medium">
                      Invitation Code <span className="text-destructive">*</span>
                    </label>
                    <Input
                      id="inviteCode"
                      placeholder="JOIN-2024-XXXXXX"
                      value={invitationCode}
                      onChange={(e) => setInvitationCode(e.target.value.toUpperCase())}
                      disabled={joiningOrg}
                      required
                      className="font-mono"
                    />
                    <p className="text-xs text-muted-foreground">
                      Enter the invitation code provided by your organization admin
                    </p>
                  </div>

                  <Button type="submit" className="w-full" disabled={joiningOrg}>
                    {joiningOrg ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Joining Organization...
                      </>
                    ) : (
                      'Join Organization'
                    )}
                  </Button>
                </form>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">
                      Need help?
                    </span>
                  </div>
                </div>

                <div className="space-y-2 text-sm text-muted-foreground">
                  <p className="flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                    <span>Ask your organization admin for an invitation code</span>
                  </p>
                  <p className="flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                    <span>Codes are case-insensitive and expire after a set period</span>
                  </p>
                  <p className="flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                    <span>You'll get the role assigned by the invitation code</span>
                  </p>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </>
  );
};
