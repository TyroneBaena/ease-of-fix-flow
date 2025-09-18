import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, XCircle, AlertCircle, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from '@/lib/toast';

interface ValidationResult {
  step: string;
  success: boolean;
  message: string;
  data?: any;
  error?: string;
}

interface ValidationSummary {
  totalSteps: number;
  passedSteps: number;
  failedSteps: number;
  criticalIssues: number;
}

export const ContractorWorkflowValidator = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<ValidationResult[]>([]);
  const [summary, setSummary] = useState<ValidationSummary | null>(null);
  const [lastValidated, setLastValidated] = useState<string | null>(null);

  const validateWorkflow = async () => {
    if (!email.trim()) {
      toast.error('Please enter a contractor email to validate');
      return;
    }

    setLoading(true);
    setResults([]);
    setSummary(null);

    try {
      console.log('Starting contractor workflow validation for:', email);

      const { data, error } = await supabase.functions.invoke('validate-contractor-workflow', {
        body: { contractorEmail: email.toLowerCase().trim() }
      });

      if (error) {
        console.error('Validation error:', error);
        throw error;
      }

      console.log('Validation results:', data);

      setResults(data.results || []);
      setSummary(data.summary || null);
      setLastValidated(new Date().toLocaleString());

      if (data.success) {
        toast.success('All validation checks passed!');
      } else {
        toast.error(`Validation failed: ${data.summary?.failedSteps || 0} issues found`);
      }

    } catch (err: any) {
      console.error('Error during validation:', err);
      toast.error(`Validation failed: ${err.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const getStepIcon = (result: ValidationResult) => {
    if (result.success) {
      return <CheckCircle className="h-5 w-5 text-green-600" />;
    } else {
      const isCritical = ['contractor_existence', 'profile_linkage', 'organization_consistency'].includes(result.step);
      return isCritical ? 
        <XCircle className="h-5 w-5 text-red-600" /> : 
        <AlertCircle className="h-5 w-5 text-yellow-600" />;
    }
  };

  const getStepTitle = (step: string) => {
    const titles: Record<string, string> = {
      contractor_existence: 'Contractor Record',
      profile_linkage: 'Profile Linkage',
      organization_consistency: 'Organization Consistency',
      rls_access_check: 'RLS Access Check',
      auth_user_status: 'Auth User Status'
    };
    return titles[step] || step;
  };

  const getStepDescription = (step: string) => {
    const descriptions: Record<string, string> = {
      contractor_existence: 'Verifies contractor record exists in database',
      profile_linkage: 'Checks if user profile is properly linked to contractor',
      organization_consistency: 'Ensures contractor and profile have matching organization IDs',
      rls_access_check: 'Tests if RLS policies allow proper data access',
      auth_user_status: 'Validates authentication user account status'
    };
    return descriptions[step] || 'Unknown validation step';
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckCircle className="h-6 w-6 text-blue-600" />
          Contractor Workflow Validator
        </CardTitle>
        <CardDescription>
          Test and validate the complete contractor invitation and setup workflow to ensure data consistency and proper access control.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Input Section */}
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <Label htmlFor="contractor-email">Contractor Email</Label>
              <Input
                id="contractor-email"
                type="email"
                placeholder="contractor@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
              />
            </div>
            <div className="flex items-end">
              <Button 
                onClick={validateWorkflow}
                disabled={loading || !email.trim()}
                className="w-full"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Validating...
                  </>
                ) : (
                  'Validate Workflow'
                )}
              </Button>
            </div>
          </div>

          {lastValidated && (
            <p className="text-sm text-gray-600">
              Last validated: {lastValidated}
            </p>
          )}
        </div>

        {/* Summary Section */}
        {summary && (
          <Alert className={summary.criticalIssues > 0 ? "border-red-200 bg-red-50" : 
                            summary.failedSteps > 0 ? "border-yellow-200 bg-yellow-50" : 
                            "border-green-200 bg-green-50"}>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <div className="flex flex-wrap gap-2">
                <Badge variant={summary.criticalIssues > 0 ? "destructive" : summary.failedSteps > 0 ? "secondary" : "default"}>
                  {summary.passedSteps}/{summary.totalSteps} Passed
                </Badge>
                {summary.failedSteps > 0 && (
                  <Badge variant="outline">
                    {summary.failedSteps} Failed
                  </Badge>
                )}
                {summary.criticalIssues > 0 && (
                  <Badge variant="destructive">
                    {summary.criticalIssues} Critical Issues
                  </Badge>
                )}
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Results Section */}
        {results.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Validation Results</h3>
            
            <div className="grid gap-4">
              {results.map((result, index) => (
                <Card key={index} className={`border-l-4 ${
                  result.success 
                    ? 'border-l-green-500 bg-green-50/50' 
                    : ['contractor_existence', 'profile_linkage', 'organization_consistency'].includes(result.step)
                      ? 'border-l-red-500 bg-red-50/50'
                      : 'border-l-yellow-500 bg-yellow-50/50'
                }`}>
                  <CardContent className="pt-4">
                    <div className="flex items-start gap-3">
                      {getStepIcon(result)}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium">{getStepTitle(result.step)}</h4>
                          <Badge 
                            variant={result.success ? "default" : "destructive"}
                            className="text-xs"
                          >
                            {result.success ? 'PASS' : 'FAIL'}
                          </Badge>
                        </div>
                        
                        <p className="text-sm text-gray-600 mb-2">
                          {getStepDescription(result.step)}
                        </p>
                        
                        <p className={`text-sm ${result.success ? 'text-green-700' : 'text-red-700'}`}>
                          {result.message}
                        </p>
                        
                        {result.error && (
                          <p className="text-sm text-red-600 mt-1 font-mono bg-red-100 p-2 rounded">
                            {result.error}
                          </p>
                        )}
                        
                        {result.data && Object.keys(result.data).length > 0 && (
                          <details className="mt-2">
                            <summary className="text-sm text-gray-500 cursor-pointer hover:text-gray-700">
                              Show details
                            </summary>
                            <pre className="text-xs bg-gray-100 p-2 rounded mt-1 overflow-x-auto">
                              {JSON.stringify(result.data, null, 2)}
                            </pre>
                          </details>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Instructions */}
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-4">
            <h4 className="font-medium text-blue-900 mb-2">How to Use This Validator</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Enter a contractor's email address who was recently invited</li>
              <li>• Click "Validate Workflow" to run comprehensive checks</li>
              <li>• Review each validation step to identify any issues</li>
              <li>• Critical issues (red) must be fixed for proper functionality</li>
              <li>• Warning issues (yellow) should be investigated but may not block functionality</li>
            </ul>
          </CardContent>
        </Card>
      </CardContent>
    </Card>
  );
};