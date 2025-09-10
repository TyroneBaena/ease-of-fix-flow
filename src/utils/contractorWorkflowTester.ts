import { supabase } from '@/integrations/supabase/client';
import { validateAndRepairContractorProfile, validateOrganizationConsistency } from './contractorValidation';

/**
 * Comprehensive workflow testing suite for contractor assignment and notifications
 * Helps identify and prevent issues before they occur in production
 */

export interface WorkflowTestResult {
  testName: string;
  passed: boolean;
  details: string;
  data?: any;
}

export interface WorkflowTestSuite {
  overallResult: 'PASS' | 'FAIL' | 'WARNING';
  totalTests: number;
  passedTests: number;
  failedTests: number;
  results: WorkflowTestResult[];
  summary: string;
}

/**
 * Runs comprehensive test suite for contractor assignment workflow
 */
export const runContractorWorkflowTests = async (
  organizationId: string
): Promise<WorkflowTestSuite> => {
  console.log(`🧪 Starting contractor workflow test suite for organization: ${organizationId}`);
  
  const results: WorkflowTestResult[] = [];
  let passedTests = 0;
  let failedTests = 0;

  // Test 1: Check for contractors without profiles
  try {
    const { data: contractorsWithoutProfiles, error } = await supabase
      .from('contractors')
      .select(`
        id,
        company_name,
        user_id,
        organization_id,
        profiles!inner(id)
      `)
      .eq('organization_id', organizationId)
      .is('profiles.id', null);

    if (error) throw error;

    const testResult: WorkflowTestResult = {
      testName: 'Contractors Without Profiles',
      passed: !contractorsWithoutProfiles || contractorsWithoutProfiles.length === 0,
      details: contractorsWithoutProfiles?.length > 0 
        ? `Found ${contractorsWithoutProfiles.length} contractors without profiles: ${contractorsWithoutProfiles.map(c => c.company_name).join(', ')}`
        : 'All contractors have profiles',
      data: contractorsWithoutProfiles
    };

    results.push(testResult);
    testResult.passed ? passedTests++ : failedTests++;
  } catch (error) {
    results.push({
      testName: 'Contractors Without Profiles',
      passed: false,
      details: `Test failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    });
    failedTests++;
  }

  // Test 2: Check for organization mismatches
  try {
    const { data: orgMismatches, error } = await supabase
      .from('contractors')
      .select(`
        id,
        company_name,
        organization_id as contractor_org,
        profiles!inner(organization_id as profile_org)
      `)
      .eq('organization_id', organizationId)
      .neq('organization_id', 'profiles.organization_id');

    if (error) throw error;

    const testResult: WorkflowTestResult = {
      testName: 'Organization Consistency',
      passed: !orgMismatches || orgMismatches.length === 0,
      details: orgMismatches?.length > 0 
        ? `Found ${orgMismatches.length} contractors with organization mismatches`
        : 'All contractor organizations are consistent',
      data: orgMismatches
    };

    results.push(testResult);
    testResult.passed ? passedTests++ : failedTests++;
  } catch (error) {
    results.push({
      testName: 'Organization Consistency',
      passed: false,
      details: `Test failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    });
    failedTests++;
  }

  // Test 3: Check notification creation permissions
  try {
    const { data: contractors, error } = await supabase
      .from('contractors')
      .select('id, company_name, user_id')
      .eq('organization_id', organizationId)
      .limit(5); // Test sample to avoid overwhelming

    if (error) throw error;

    let notificationTestPassed = true;
    const notificationIssues: string[] = [];

    for (const contractor of contractors || []) {
      try {
        // Test creating a test notification (we'll delete it immediately)
        const { error: notificationError } = await supabase
          .from('notifications')
          .insert({
            title: 'Test Notification - DELETE ME',
            message: 'This is a test notification that should be deleted immediately',
            type: 'info',
            user_id: contractor.user_id,
            organization_id: organizationId
          })
          .select()
          .single();

        if (notificationError) {
          notificationTestPassed = false;
          notificationIssues.push(`${contractor.company_name}: ${notificationError.message}`);
        } else {
          // Clean up test notification
          await supabase
            .from('notifications')
            .delete()
            .eq('user_id', contractor.user_id)
            .eq('title', 'Test Notification - DELETE ME');
        }
      } catch (testError) {
        notificationTestPassed = false;
        notificationIssues.push(`${contractor.company_name}: ${testError instanceof Error ? testError.message : 'Unknown error'}`);
      }
    }

    const testResult: WorkflowTestResult = {
      testName: 'Notification Creation Test',
      passed: notificationTestPassed,
      details: notificationTestPassed 
        ? 'All contractors can receive notifications'
        : `Notification issues found: ${notificationIssues.join('; ')}`,
      data: notificationIssues
    };

    results.push(testResult);
    testResult.passed ? passedTests++ : failedTests++;
  } catch (error) {
    results.push({
      testName: 'Notification Creation Test',
      passed: false,
      details: `Test failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    });
    failedTests++;
  }

  // Test 4: Check maintenance requests assignment capability
  try {
    const { data: requests, error } = await supabase
      .from('maintenance_requests')
      .select('id, title, organization_id')
      .eq('organization_id', organizationId)
      .is('contractor_id', null)
      .limit(5);

    if (error) throw error;

    const { data: contractors, error: contractorError } = await supabase
      .from('contractors')
      .select('id, company_name, organization_id')
      .eq('organization_id', organizationId)
      .limit(3);

    if (contractorError) throw contractorError;

    let assignmentTestPassed = true;
    const assignmentIssues: string[] = [];

    // Test organization consistency for potential assignments
    for (const request of requests || []) {
      for (const contractor of contractors || []) {
        const validation = await validateOrganizationConsistency(request.id, contractor.id);
        if (!validation.isValid) {
          assignmentTestPassed = false;
          assignmentIssues.push(`Request ${request.title} -> ${contractor.company_name}: ${validation.error}`);
        }
      }
    }

    const testResult: WorkflowTestResult = {
      testName: 'Assignment Validation Test',
      passed: assignmentTestPassed,
      details: assignmentTestPassed 
        ? 'All potential assignments pass organization validation'
        : `Assignment validation issues: ${assignmentIssues.join('; ')}`,
      data: assignmentIssues
    };

    results.push(testResult);
    testResult.passed ? passedTests++ : failedTests++;
  } catch (error) {
    results.push({
      testName: 'Assignment Validation Test',
      passed: false,
      details: `Test failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    });
    failedTests++;
  }

  // Generate test suite summary
  const totalTests = results.length;
  const overallResult = failedTests === 0 ? 'PASS' : (passedTests > failedTests ? 'WARNING' : 'FAIL');
  
  const summary = `Test Suite ${overallResult}: ${passedTests}/${totalTests} tests passed. ${
    failedTests > 0 ? `${failedTests} issues found that may cause assignment failures.` : 'All tests passed successfully.'
  }`;

  const testSuite: WorkflowTestSuite = {
    overallResult,
    totalTests,
    passedTests,
    failedTests,
    results,
    summary
  };

  console.log(`🧪 Contractor workflow test suite completed: ${summary}`);
  
  return testSuite;
};

/**
 * Quick health check for immediate issues
 */
export const quickContractorHealthCheck = async (organizationId: string) => {
  console.log(`🏥 Running quick contractor health check for organization: ${organizationId}`);
  
  try {
    // Check for the most critical issue: contractors without profiles
    const { data: criticalIssues, error } = await supabase
      .from('contractors')
      .select('id, company_name, user_id')
      .eq('organization_id', organizationId)
      .filter('user_id', 'not.is', null);

    if (error) throw error;

    let issuesFound = 0;
    let issuesFixed = 0;

    for (const contractor of criticalIssues || []) {
      const validation = await validateAndRepairContractorProfile(contractor.id);
      if (!validation.isValid) {
        issuesFound++;
      }
      if (validation.wasRepaired) {
        issuesFixed++;
      }
    }

    const result = {
      status: issuesFound === 0 ? 'HEALTHY' : (issuesFixed === issuesFound ? 'REPAIRED' : 'ISSUES_FOUND'),
      contractorsChecked: criticalIssues?.length || 0,
      issuesFound,
      issuesFixed,
      message: issuesFound === 0 
        ? 'All contractors are healthy' 
        : `Found ${issuesFound} issues, automatically fixed ${issuesFixed}`
    };

    console.log(`🏥 Health check completed: ${result.message}`);
    return result;
  } catch (error) {
    console.error('Health check failed:', error);
    return {
      status: 'ERROR',
      contractorsChecked: 0,
      issuesFound: 0,
      issuesFixed: 0,
      message: `Health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
};