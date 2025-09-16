import { useEffect } from 'react';
import { useUserContext } from '@/contexts/UnifiedAuthContext';
import { validateAllContractorsInOrganization } from '@/utils/contractorValidation';
import { quickContractorHealthCheck, runContractorWorkflowTests } from '@/utils/contractorWorkflowTester';

/**
 * Monitoring hook that proactively validates contractor profiles
 * Runs when an admin user loads the application to prevent future issues
 */
export const useContractorProfileMonitoring = () => {
  const { currentUser } = useUserContext();

  useEffect(() => {
    const runProactiveValidation = async () => {
      // Only run for admin users
      if (!currentUser || !currentUser.organization_id || currentUser.role !== 'admin') {
        return;
      }

      try {
        console.log('🔍 Running proactive contractor profile validation...');
        
        // First run a quick health check
        const healthCheck = await quickContractorHealthCheck(currentUser.organization_id);
        console.log(`🏥 Health check result: ${healthCheck.message}`);
        
        // If issues were found, run full validation
        if (healthCheck.issuesFound > 0) {
          console.log('🔧 Issues detected, running full validation...');
          const results = await validateAllContractorsInOrganization(currentUser.organization_id);
          
          if (results && results.length > 0) {
            const repairedCount = results.filter(r => r.wasRepaired).length;
            const issueCount = results.filter(r => r.issues.length > 0 && !r.wasRepaired).length;
            
            if (repairedCount > 0) {
              console.log(`✅ Auto-repaired ${repairedCount} contractor profile(s)`);
            }
            
            if (issueCount > 0) {
              console.warn(`⚠️ Found ${issueCount} contractor(s) with unresolved issues`);
            }
          }
        }
        
        // Run comprehensive workflow tests in development mode
        if (process.env.NODE_ENV === 'development') {
          console.log('🧪 Running comprehensive workflow tests...');
          const testResults = await runContractorWorkflowTests(currentUser.organization_id);
          console.log(`🧪 Test Results: ${testResults.summary}`);
          
          if (testResults.failedTests > 0) {
            console.warn('🚨 Workflow tests found potential issues:');
            testResults.results
              .filter(r => !r.passed)
              .forEach(r => console.warn(`  ❌ ${r.testName}: ${r.details}`));
          }
        }
        
      } catch (error) {
        console.error('Contractor profile monitoring failed:', error);
      }
    };

    // Run validation with a small delay to avoid blocking initial load
    const timeoutId = setTimeout(runProactiveValidation, 2000);
    
    return () => clearTimeout(timeoutId);
  }, [currentUser?.organization_id, currentUser?.role]);
};