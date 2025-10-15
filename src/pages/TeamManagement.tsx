import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { GenerateCodeDialog } from '@/components/team/GenerateCodeDialog';
import { InvitationCodesTable } from '@/components/team/InvitationCodesTable';
import { invitationCodeService, InvitationCode } from '@/services/invitationCodeService';
import { Users, QrCode, Shield } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export const TeamManagement = () => {
  const { toast } = useToast();
  const [codes, setCodes] = useState<InvitationCode[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCodes = async () => {
    setLoading(true);
    try {
      const { codes: fetchedCodes, error } = await invitationCodeService.getOrganizationCodes();
      
      if (error) {
        toast({
          title: 'Error',
          description: 'Failed to load invitation codes',
          variant: 'destructive',
        });
        return;
      }

      setCodes(fetchedCodes);
    } catch (error) {
      console.error('Error fetching codes:', error);
      toast({
        title: 'Error',
        description: 'Failed to load invitation codes',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCodes();
  }, []);

  const activeCodes = codes.filter(
    (code) => code.is_active && new Date(code.expires_at) > new Date() && code.current_uses < code.max_uses
  );
  const expiredCodes = codes.filter(
    (code) => !code.is_active || new Date(code.expires_at) <= new Date() || code.current_uses >= code.max_uses
  );

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Team Management</h1>
          <p className="text-muted-foreground mt-1">
            Generate and manage invitation codes for your organization
          </p>
        </div>
        <GenerateCodeDialog onCodeGenerated={fetchCodes} />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Codes</CardTitle>
            <QrCode className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeCodes.length}</div>
            <p className="text-xs text-muted-foreground">
              Ready to be used
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Invitations</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {codes.reduce((sum, code) => sum + code.current_uses, 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              People joined via codes
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Expired/Used</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{expiredCodes.length}</div>
            <p className="text-xs text-muted-foreground">
              No longer active
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Invitation Codes</CardTitle>
          <CardDescription>
            Manage all invitation codes for your organization
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="active" className="space-y-4">
            <TabsList>
              <TabsTrigger value="active">
                Active Codes ({activeCodes.length})
              </TabsTrigger>
              <TabsTrigger value="all">
                All Codes ({codes.length})
              </TabsTrigger>
              <TabsTrigger value="expired">
                Expired/Used ({expiredCodes.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="active">
              {loading ? (
                <p className="text-center py-4 text-muted-foreground">Loading...</p>
              ) : (
                <InvitationCodesTable codes={activeCodes} onRefresh={fetchCodes} />
              )}
            </TabsContent>

            <TabsContent value="all">
              {loading ? (
                <p className="text-center py-4 text-muted-foreground">Loading...</p>
              ) : (
                <InvitationCodesTable codes={codes} onRefresh={fetchCodes} />
              )}
            </TabsContent>

            <TabsContent value="expired">
              {loading ? (
                <p className="text-center py-4 text-muted-foreground">Loading...</p>
              ) : (
                <InvitationCodesTable codes={expiredCodes} onRefresh={fetchCodes} />
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>How It Works</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <div className="flex gap-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold flex-shrink-0">
              1
            </div>
            <div>
              <p className="font-medium text-foreground">Generate Code</p>
              <p>Click "Generate Invitation Code" and set the role, expiration, and max uses</p>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold flex-shrink-0">
              2
            </div>
            <div>
              <p className="font-medium text-foreground">Share Code</p>
              <p>Copy and share the generated code with intended team members via email, message, or in person</p>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold flex-shrink-0">
              3
            </div>
            <div>
              <p className="font-medium text-foreground">User Joins</p>
              <p>New users enter the code during onboarding and are automatically added to your organization</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
