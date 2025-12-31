import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { MaintenanceRequest } from '@/types/maintenance';
import { formatIssueType } from '@/types/propertyInsights';

interface CategoryChartProps {
  requests?: MaintenanceRequest[];
}

const CategoryChart: React.FC<CategoryChartProps> = ({ requests = [] }) => {
  // Calculate category counts from AI issue types or fallback to category
  const categoryCountsMap = requests.reduce((acc, request) => {
    // Prefer ai_issue_type if available, otherwise use category
    const rawCategory = (request as any).aiIssueType || 
                        (request as any).ai_issue_type || 
                        request.category || 
                        'uncategorized';
    
    // Normalize the category
    const category = rawCategory.toLowerCase();
    acc[category] = (acc[category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  // Convert to array and sort by count
  const data = Object.entries(categoryCountsMap)
    .map(([name, value]) => ({ 
      name: formatIssueType(name),
      value 
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10); // Top 10 categories

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
        No data available
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 5, right: 30, left: 80, bottom: 5 }}
      >
        <XAxis type="number" hide />
        <YAxis type="category" dataKey="name" width={75} tick={{ fontSize: 11 }} />
        <Tooltip formatter={(value: number) => [`${value} requests`, 'Count']} />
        <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
};

export default CategoryChart;
