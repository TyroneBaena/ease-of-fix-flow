import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Users, 
  Key, 
  Database, 
  CheckCircle, 
  XCircle, 
  Loader2,
  Code,
  Copy
} from 'lucide-react';
import { createTestUsers, checkTestUsersExist } from '@/utils/createTestUsers';
import { TEST_CREDENTIALS, displayTestCredentials } from '@/utils/testCredentials';
import { toast } from 'sonner';
import { useUserContext } from '@/contexts/UnifiedAuthContext';

const DevToolsPanel = () => {
  const { isAdmin } = useUserContext();
  const [loading, setLoading] = useState(false);
  const [userStatus, setUserStatus] = useState<{ [key: string]: boolean }>({});
  const [showCredentials, setShowCredentials] = useState(false);

  const handleCreateTestUsers = async () => {
    setLoading(true);
    try {
      await createTestUsers();
      // Refresh user status after creation
      await handleCheckUsers();
    } catch (error) {
      console.error('Error creating test users:', error);
      toast.error('Failed to create test users');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckUsers = async () => {
    setLoading(true);
    try {
      const status = await checkTestUsersExist();
      setUserStatus(status);
      
      const existingCount = Object.values(status).filter(Boolean).length;
      toast.success(`Checked test users: ${existingCount}/3 exist`);
    } catch (error) {
      console.error('Error checking users:', error);
      toast.error('Failed to check user status');
    } finally {
      setLoading(false);
    }
  };

  const copyCredentials = (email: string, password: string) => {
    navigator.clipboard.writeText(`Email: ${email}\nPassword: ${password}`);
    toast.success('Credentials copied to clipboard');
  };

  const copyAllCredentials = () => {
    const allCreds = TEST_CREDENTIALS.map(cred => 
      `${cred.role.toUpperCase()}: ${cred.email} / ${cred.password}`
    ).join('\n');
    
    navigator.clipboard.writeText(allCreds);
    toast.success('All credentials copied to clipboard');
  };

  // Only show to admin users
  if (!isAdmin) {
    return null;
  }

  return (
    <Card className="mb-6 border-dashed border-2 border-muted-foreground/25">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Code className="h-5 w-5 text-muted-foreground" />
          <CardTitle className="text-lg">Development Tools</CardTitle>
        </div>
        <CardDescription>
          Create and manage test user credentials for development
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3">
          <Button 
            onClick={handleCreateTestUsers}
            disabled={loading}
            className="flex items-center gap-2"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Users className="h-4 w-4" />
            )}
            Create Test Users
          </Button>
          
          <Button 
            variant="outline"
            onClick={handleCheckUsers}
            disabled={loading}
            className="flex items-center gap-2"
          >
            <Database className="h-4 w-4" />
            Check Status
          </Button>
          
          <Button 
            variant="outline"
            onClick={() => {
              displayTestCredentials();
              setShowCredentials(!showCredentials);
            }}
            className="flex items-center gap-2"
          >
            <Key className="h-4 w-4" />
            {showCredentials ? 'Hide' : 'Show'} Credentials
          </Button>
        </div>

        {/* User Status */}
        {Object.keys(userStatus).length > 0 && (
          <>
            <Separator />
            <div>
              <h4 className="text-sm font-medium mb-3">Test User Status</h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {TEST_CREDENTIALS.map((cred) => (
                  <div key={cred.role} className="flex items-center justify-between p-3 rounded-lg border">
                    <div className="flex items-center gap-2">
                      {userStatus[cred.role] ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-500" />
                      )}
                      <span className="text-sm font-medium capitalize">{cred.role}</span>
                    </div>
                    <Badge variant={userStatus[cred.role] ? "default" : "destructive"}>
                      {userStatus[cred.role] ? 'Exists' : 'Missing'}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Credentials Display */}
        {showCredentials && (
          <>
            <Separator />
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-medium">Test Credentials</h4>
                <Button 
                  size="sm" 
                  variant="ghost" 
                  onClick={copyAllCredentials}
                  className="h-7 text-xs"
                >
                  <Copy className="h-3 w-3 mr-1" />
                  Copy All
                </Button>
              </div>
              
              <div className="space-y-3">
                {TEST_CREDENTIALS.map((cred) => (
                  <div key={cred.role} className="p-3 rounded-lg bg-muted/50 border">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="capitalize">
                            {cred.role}
                          </Badge>
                          <span className="text-sm font-medium">{cred.name}</span>
                        </div>
                        <div className="text-sm text-muted-foreground space-y-1">
                          <div><strong>Email:</strong> {cred.email}</div>
                          <div><strong>Password:</strong> {cred.password}</div>
                          <div className="text-xs">{cred.description}</div>
                        </div>
                      </div>
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        onClick={() => copyCredentials(cred.email, cred.password)}
                        className="h-7 text-xs"
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        <div className="text-xs text-muted-foreground mt-4 p-2 bg-muted/30 rounded">
          ⚠️ These are development tools only. Test credentials should not be used in production.
        </div>
      </CardContent>
    </Card>
  );
};

export default DevToolsPanel;