export interface RecurringIssue {
  category: string;
  count: number;
  locations: string[];
  pattern: string;
  severity: 'low' | 'medium' | 'high';
}

export interface SystemicProblem {
  problem: string;
  evidence: string;
  severity: 'low' | 'medium' | 'high';
}

export interface Recommendation {
  action: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  reasoning: string;
}

export interface PropertyInsightData {
  recurringIssues: RecurringIssue[];
  systemicProblems: SystemicProblem[];
  recommendations: Recommendation[];
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  summary: string;
  requestsAnalyzed: number;
}

export interface PropertyInsight {
  id: string;
  property_id: string;
  organization_id: string;
  insight_type: string;
  insight_data: PropertyInsightData;
  period_start?: string;
  period_end?: string;
  created_at: string;
  updated_at: string;
}

export interface CategorizationResult {
  issueType: string;
  issueTags: string[];
  affectedArea: string;
  confidence: 'high' | 'medium' | 'low';
}

// Helper to format issue types for display
export const formatIssueType = (issueType: string): string => {
  if (!issueType) return 'Unknown';
  
  const parts = issueType.split('_');
  if (parts.length < 2) return issueType.charAt(0).toUpperCase() + issueType.slice(1);
  
  const category = parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
  const subtype = parts.slice(1).map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' ');
  
  return `${category} - ${subtype}`;
};

// Risk level colors for UI
export const getRiskLevelColor = (riskLevel: string): string => {
  switch (riskLevel) {
    case 'critical': return 'text-red-600 bg-red-100';
    case 'high': return 'text-orange-600 bg-orange-100';
    case 'medium': return 'text-yellow-600 bg-yellow-100';
    case 'low': return 'text-green-600 bg-green-100';
    default: return 'text-muted-foreground bg-muted';
  }
};

export const getRiskLevelLabel = (riskLevel: string): string => {
  switch (riskLevel) {
    case 'critical': return 'Critical Risk';
    case 'high': return 'High Risk';
    case 'medium': return 'Medium Risk';
    case 'low': return 'Low Risk';
    default: return 'Unknown';
  }
};
