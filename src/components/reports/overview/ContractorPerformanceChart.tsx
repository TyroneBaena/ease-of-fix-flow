import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, CheckCircle, Clock, TrendingUp } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface ContractorStats {
  id: string;
  name: string;
  totalAssigned: number;
  completedCount: number;
  completionRate: number;
  avgResponseTime: number; // hours
}

interface ContractorPerformanceChartProps {
  data: ContractorStats[];
}

const formatDuration = (hours: number): string => {
  if (hours === 0) return '—';
  if (hours < 24) return `${hours.toFixed(1)} hrs`;
  const days = hours / 24;
  return `${days.toFixed(1)} days`;
};

const ContractorPerformanceChart = ({ data }: ContractorPerformanceChartProps) => {
  const hasData = data.length > 0;

  // Sort by completion rate for the chart
  const sortedData = [...data].sort((a, b) => b.completionRate - a.completionRate);

  // Calculate overall stats
  const totalAssigned = data.reduce((sum, c) => sum + c.totalAssigned, 0);
  const totalCompleted = data.reduce((sum, c) => sum + c.completedCount, 0);
  const overallCompletionRate = totalAssigned > 0 ? (totalCompleted / totalAssigned) * 100 : 0;
  const avgResponseTimes = data.filter(c => c.avgResponseTime > 0).map(c => c.avgResponseTime);
  const overallAvgResponse = avgResponseTimes.length > 0 
    ? avgResponseTimes.reduce((a, b) => a + b, 0) / avgResponseTimes.length 
    : 0;

  if (!hasData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Users className="h-5 w-5" />
            Contractor Performance
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-8 text-center">
          <p className="text-muted-foreground">
            No contractor assignments to analyze yet.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Users className="h-5 w-5" />
          Contractor Performance
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Summary Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <div className="bg-muted/50 rounded-lg p-3 text-center">
            <p className="text-xs text-muted-foreground mb-1">Contractors</p>
            <p className="text-xl font-bold text-foreground">{data.length}</p>
          </div>
          <div className="bg-muted/50 rounded-lg p-3 text-center">
            <p className="text-xs text-muted-foreground mb-1">Total Assigned</p>
            <p className="text-xl font-bold text-foreground">{totalAssigned}</p>
          </div>
          <div className="bg-muted/50 rounded-lg p-3 text-center">
            <p className="text-xs text-muted-foreground mb-1">Completion Rate</p>
            <p className="text-xl font-bold text-primary">{overallCompletionRate.toFixed(0)}%</p>
          </div>
          <div className="bg-muted/50 rounded-lg p-3 text-center">
            <p className="text-xs text-muted-foreground mb-1">Avg Response</p>
            <p className="text-xl font-bold" style={{ color: 'hsl(var(--chart-2))' }}>
              {formatDuration(overallAvgResponse)}
            </p>
          </div>
        </div>

        {/* Completion Rate Chart */}
        <div className="mb-4">
          <h4 className="text-sm font-medium text-muted-foreground mb-3">Completion Rate by Contractor</h4>
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={sortedData.slice(0, 8)}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis 
                  type="number" 
                  domain={[0, 100]}
                  tickFormatter={(value) => `${value}%`}
                  fontSize={12}
                />
                <YAxis 
                  type="category" 
                  dataKey="name" 
                  fontSize={11}
                  width={95}
                  tickFormatter={(value) => value.length > 15 ? `${value.slice(0, 15)}...` : value}
                />
                <Tooltip 
                  formatter={(value: number, name: string, props: any) => {
                    const contractor = props.payload;
                    return [
                      `${value.toFixed(1)}% (${contractor.completedCount}/${contractor.totalAssigned})`,
                      'Completion Rate'
                    ];
                  }}
                  contentStyle={{
                    backgroundColor: 'hsl(var(--popover))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                />
                <Bar dataKey="completionRate" radius={[0, 4, 4, 0]}>
                  {sortedData.slice(0, 8).map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.completionRate >= 70 
                        ? 'hsl(var(--chart-2))' 
                        : entry.completionRate >= 40 
                          ? 'hsl(var(--chart-4))' 
                          : 'hsl(var(--chart-5))'
                      } 
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Contractor Table */}
        <div className="mt-6">
          <h4 className="text-sm font-medium text-muted-foreground mb-3">Detailed Breakdown</h4>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 font-medium text-muted-foreground">Contractor</th>
                  <th className="text-center py-2 font-medium text-muted-foreground">Assigned</th>
                  <th className="text-center py-2 font-medium text-muted-foreground">Completed</th>
                  <th className="text-center py-2 font-medium text-muted-foreground">Rate</th>
                  <th className="text-center py-2 font-medium text-muted-foreground">Avg Response</th>
                </tr>
              </thead>
              <tbody>
                {sortedData.slice(0, 10).map((contractor) => (
                  <tr key={contractor.id} className="border-b border-border/50">
                    <td className="py-2 font-medium">{contractor.name}</td>
                    <td className="py-2 text-center">{contractor.totalAssigned}</td>
                    <td className="py-2 text-center">{contractor.completedCount}</td>
                    <td className="py-2 text-center">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        contractor.completionRate >= 70 
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                          : contractor.completionRate >= 40
                            ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                            : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                      }`}>
                        {contractor.completionRate.toFixed(0)}%
                      </span>
                    </td>
                    <td className="py-2 text-center text-muted-foreground">
                      {formatDuration(contractor.avgResponseTime)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ContractorPerformanceChart;
