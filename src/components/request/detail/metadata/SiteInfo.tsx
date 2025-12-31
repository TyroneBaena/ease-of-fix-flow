import React from 'react';
import { Brain } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface SiteInfoProps {
  aiIssueType?: string | null;
}

const formatIssueType = (issueType: string): string => {
  return issueType
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

export const SiteInfo = ({ aiIssueType }: SiteInfoProps) => {
  return (
    <div className="flex items-center">
      <Brain className="h-4 w-4 text-muted-foreground mr-2" />
      <div>
        <p className="text-xs text-muted-foreground">Issue Type</p>
        {aiIssueType ? (
          <Badge variant="secondary" className="font-medium">
            {formatIssueType(aiIssueType)}
          </Badge>
        ) : (
          <p className="text-sm text-muted-foreground">Uncategorized</p>
        )}
      </div>
    </div>
  );
};
