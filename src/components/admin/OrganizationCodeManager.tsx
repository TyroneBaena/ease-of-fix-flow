import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Copy, RefreshCw, ExternalLink } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/lib/toast';
import { useUserContext } from '@/contexts/UserContext';

interface Organization {
  id: string;
  name: string;
  organization_code: string;
  slug: string;
  created_at: string;
}

const OrganizationCodeManager = () => {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingCodes, setUpdatingCodes] = useState<Set<string>>(new Set());
  const { isAdmin } = useUserContext();

  useEffect(() => {
    if (isAdmin) {
      fetchOrganizations();
    }
  }, [isAdmin]);

  const fetchOrganizations = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('organizations')
        .select('id, name, organization_code, slug, created_at')
        .order('name');

      if (error) throw error;
      setOrganizations(data || []);
    } catch (error) {
      console.error('Error fetching organizations:', error);
      toast.error('Failed to fetch organizations');
    } finally {
      setLoading(false);
    }
  };

  const generateNewCode = async (orgId: string) => {
    try {
      setUpdatingCodes(prev => new Set(prev).add(orgId));
      
      // Generate a new unique code
      const newCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      
      const { error } = await supabase
        .from('organizations')
        .update({ organization_code: newCode })
        .eq('id', orgId);

      if (error) throw error;

      // Update local state
      setOrganizations(prev => 
        prev.map(org => 
          org.id === orgId ? { ...org, organization_code: newCode } : org
        )
      );

      toast.success('Organization code updated successfully');
    } catch (error) {
      console.error('Error updating organization code:', error);
      toast.error('Failed to update organization code');
    } finally {
      setUpdatingCodes(prev => {
        const newSet = new Set(prev);
        newSet.delete(orgId);
        return newSet;
      });
    }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success('Organization code copied to clipboard');
  };

  const copyInviteLink = (code: string) => {
    const baseUrl = window.location.origin;
    const inviteLink = `${baseUrl}/login?org=${code}`;
    navigator.clipboard.writeText(inviteLink);
    toast.success('Invite link copied to clipboard');
  };

  if (!isAdmin) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-muted-foreground">
            Access denied. Admin privileges required.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-muted-foreground">Loading organizations...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Organization Access Codes
            <Badge variant="secondary">Phase 3</Badge>
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Manage organization codes that allow users to access specific organizations directly via URL parameters.
            Share invitation links with the organization code to give users direct access.
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {organizations.map((org) => (
              <div key={org.id} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium">{org.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      Created: {new Date(org.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <Badge variant="outline" className="font-mono">
                    {org.organization_code}
                  </Badge>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyCode(org.organization_code)}
                    className="flex items-center gap-2"
                  >
                    <Copy size={16} />
                    Copy Code
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyInviteLink(org.organization_code)}
                    className="flex items-center gap-2"
                  >
                    <ExternalLink size={16} />
                    Copy Invite Link
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => generateNewCode(org.id)}
                    disabled={updatingCodes.has(org.id)}
                    className="flex items-center gap-2"
                  >
                    <RefreshCw size={16} className={updatingCodes.has(org.id) ? 'animate-spin' : ''} />
                    Generate New Code
                  </Button>
                </div>
                
                <div className="bg-muted p-3 rounded text-sm">
                  <Label className="text-xs font-medium">Direct Access URL:</Label>
                  <p className="font-mono text-xs break-all">
                    {window.location.origin}/login?org={org.organization_code}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>How Organization Codes Work</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <h4 className="font-medium">For New Users:</h4>
            <p className="text-sm text-muted-foreground">
              When you invite a new user, their invitation email will automatically include the organization code in the login link. They'll be redirected to the correct organization after login.
            </p>
          </div>
          
          <div className="space-y-2">
            <h4 className="font-medium">For Existing Users:</h4>
            <p className="text-sm text-muted-foreground">
              Share the direct access URL with existing users to give them quick access to your organization. They'll be automatically switched to your organization when they log in.
            </p>
          </div>
          
          <div className="space-y-2">
            <h4 className="font-medium">Security:</h4>
            <p className="text-sm text-muted-foreground">
              Users can only access organizations they have membership in. The organization code simply provides a convenient way to direct them to the right organization.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default OrganizationCodeManager;