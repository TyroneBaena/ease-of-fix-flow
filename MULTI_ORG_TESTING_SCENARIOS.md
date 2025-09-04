# Multi-Organization Testing Scenarios

## 🔍 Overview
This document outlines comprehensive testing scenarios for multi-organization functionality where managers can be assigned to multiple organizations.

## ✅ FIXED CRITICAL ISSUES
- **Email Relay Token Security** - Fixed RLS policies to prevent cross-organization token access
- **Budget Categories Exposure** - Added organization-based isolation
- **Quote Organization Validation** - Enhanced security checks in quote operations

## 🧪 TEST SCENARIOS TO VERIFY

### 1. User Invitation to Multiple Organizations

#### Scenario A: Manager Invited to Second Organization
**Steps:**
1. Admin in Org A invites existing manager from Org B
2. Manager should receive invitation email
3. Manager should be added to Org A with proper role
4. Manager should see both organizations in switcher

**Expected Results:**
- ✅ User gets added to `user_organizations` table with correct org_id
- ✅ User can switch between organizations
- ✅ Data remains isolated per organization
- ✅ No access to cross-organization data

#### Scenario B: New User Invited to Organization
**Steps:**
1. Admin invites completely new user
2. User signs up and gets assigned to inviting admin's organization
3. User should only see their assigned organization initially

**Expected Results:**
- ✅ User profile created with correct organization_id
- ✅ User organization membership created
- ✅ User cannot see other organizations' data

### 2. Organization Switching

#### Scenario A: Successful Organization Switch
**Steps:**
1. Manager with access to multiple orgs logs in
2. Manager switches from Org A to Org B
3. Dashboard data should update to show Org B's data only

**Expected Results:**
- ✅ `session_organization_id` updated in profiles table
- ✅ Current organization context updated
- ✅ All data queries filtered to new organization
- ✅ UI reflects current organization

#### Scenario B: Organization Switch Persistence
**Steps:**
1. Manager switches to Org B
2. Manager refreshes page or logs out/in
3. Should remain in Org B (last selected organization)

**Expected Results:**
- ✅ Session organization persists across page refreshes
- ✅ User returns to last selected organization on login

### 3. Data Isolation Testing

#### Scenario A: Maintenance Requests Isolation
**Steps:**
1. Manager in Org A creates maintenance request
2. Manager switches to Org B
3. Should not see Org A's requests

**Expected Results:**
- ✅ RLS policies prevent cross-organization data access
- ✅ Dashboard shows only current organization's requests
- ✅ No data leakage in API responses

#### Scenario B: Contractor Isolation
**Steps:**
1. Manager in Org A views contractors list
2. Should only see contractors assigned to Org A
3. Cannot assign contractors from other organizations

**Expected Results:**
- ✅ Contractors filtered by organization_id
- ✅ Quote requests only go to same-organization contractors
- ✅ No cross-organization contractor assignments

#### Scenario C: Properties Isolation
**Steps:**
1. Manager views properties in current organization
2. Switches to different organization
3. Should see different set of properties

**Expected Results:**
- ✅ Properties properly filtered by organization
- ✅ No access to other organizations' properties
- ✅ Property-specific requests properly isolated

### 4. Permission and Role Testing

#### Scenario A: Role Consistency Across Organizations
**Steps:**
1. User has 'manager' role in Org A and 'admin' role in Org B
2. Switch between organizations
3. Permissions should change based on current organization role

**Expected Results:**
- ✅ Role-based access control works per organization
- ✅ UI elements show/hide based on current org role
- ✅ API calls respect current organization role

#### Scenario B: Organization Admin Actions
**Steps:**
1. User with admin role in one org tries admin actions
2. User switches to org where they have manager role
3. Admin actions should be restricted

**Expected Results:**
- ✅ Admin functions disabled in organizations where user is not admin
- ✅ User management restricted to appropriate organizations
- ✅ Settings access controlled per organization

### 5. Edge Cases and Error Scenarios

#### Scenario A: Removed from Organization
**Steps:**
1. Admin removes user from organization while user is active
2. User should be redirected or see appropriate error
3. User should lose access to that organization's data

**Expected Results:**
- ✅ User receives appropriate notification
- ✅ Organization removed from available organizations list
- ✅ User switched to remaining organization or logged out

#### Scenario B: Organization Switching Failures
**Steps:**
1. Network error during organization switch
2. Database error during organization switch
3. Should handle gracefully without leaving user in bad state

**Expected Results:**
- ✅ Error messages displayed appropriately
- ✅ User remains in original organization on failure
- ✅ No partial state updates

#### Scenario C: Concurrent Organization Access
**Steps:**
1. Same user logged in from multiple devices
2. Switches organization on one device
3. Other device should handle the change appropriately

**Expected Results:**
- ✅ Session synchronization works correctly
- ✅ No data inconsistencies between sessions
- ✅ Appropriate notifications or data refresh

### 6. Database Integrity Testing

#### Scenario A: Organization ID Validation
**Steps:**
1. Attempt to create maintenance request with wrong organization_id
2. Attempt to assign contractor from different organization
3. Should be prevented by database constraints

**Expected Results:**
- ✅ Database triggers prevent cross-organization assignments
- ✅ RLS policies block unauthorized data access
- ✅ Application displays appropriate error messages

#### Scenario B: Foreign Key Constraints
**Steps:**
1. Check all tables have proper organization_id references
2. Verify cascade delete behavior
3. Test orphaned record prevention

**Expected Results:**
- ✅ All multi-tenant tables have organization_id column
- ✅ Foreign key constraints properly enforce relationships
- ✅ No orphaned records across organizations

## 🚨 CRITICAL SECURITY CHECKS

### 1. Cross-Organization Data Leakage
- ✅ **FIXED**: Email relay tokens properly isolated
- ✅ **FIXED**: Budget categories organization-scoped
- ⚠️ **VERIFY**: All API endpoints respect organization boundaries
- ⚠️ **VERIFY**: No data visible in network requests from other orgs

### 2. Authentication Bypass Attempts
- ⚠️ **TEST**: Direct API calls with manipulated organization_id
- ⚠️ **TEST**: JWT token manipulation attempts
- ⚠️ **TEST**: Session hijacking between organizations

### 3. SQL Injection via Organization Context
- ⚠️ **TEST**: Organization ID parameter injection
- ⚠️ **TEST**: RLS policy bypass attempts
- ⚠️ **TEST**: Database function parameter manipulation

## 🔧 TESTING TOOLS PROVIDED

### Multi-Organization Testing Panel
- Located in Settings > Multi-Org Testing (Admin only)
- Tests all scenarios automatically
- Reports security violations and data leakage
- Provides detailed logs for debugging

### Manual Testing Checklist
1. **Setup Test Data**: Create multiple organizations with test users
2. **Cross-Organization Assignment**: Assign test user to multiple orgs
3. **Data Creation**: Create test data in each organization
4. **Switching Test**: Verify organization switching works correctly
5. **Isolation Verification**: Confirm data isolation between organizations
6. **Permission Testing**: Verify role-based access per organization
7. **Error Handling**: Test edge cases and error scenarios

## 📊 SUCCESS CRITERIA

### All Tests Must Pass:
- ✅ No cross-organization data visible in any context
- ✅ Organization switching works reliably
- ✅ Session persistence works correctly
- ✅ Role-based permissions respect current organization
- ✅ Error handling is graceful and informative
- ✅ Database integrity maintained across all scenarios

### Performance Requirements:
- Organization switching completes within 2 seconds
- Data filtering adds minimal query overhead
- UI updates immediately reflect organization changes
- No memory leaks from organization context switching

## 🎯 NEXT STEPS

1. **Run Automated Tests**: Use the Multi-Org Testing Panel to verify all scenarios
2. **Manual Verification**: Test edge cases manually with real user workflows
3. **Load Testing**: Test organization switching under concurrent load
4. **Security Audit**: Independent security review of multi-org implementation
5. **User Acceptance Testing**: Have actual users test multi-org workflows

## 📋 RISK ASSESSMENT

### High Risk (Addressed):
- ✅ Cross-organization data exposure - **FIXED**
- ✅ Authentication bypass via org switching - **MITIGATED**
- ✅ Database constraint violations - **FIXED**

### Medium Risk (Monitor):
- ⚠️ Session synchronization issues across devices
- ⚠️ Performance degradation with many organizations
- ⚠️ Complex permission inheritance scenarios

### Low Risk:
- UI/UX inconsistencies during organization switching
- Minor data refresh delays
- Organization name display edge cases