import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock, ArrowRight } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface LifecycleMetrics {
  avgTimeToAssign: number;
  avgTimeToComplete: number;
  avgTotalResolution: number;
  completedCount: number;
  assignedCount: number;
}

interface LifecycleDurationChartProps {
  data: LifecycleMetrics;
}

const formatDuration = (hours: number): string => {
  if (hours === 0) return '0 hrs';
  if (hours < 24) return `${hours.toFixed(1)} hrs`;
  const days = hours / 24;
  return `${days.toFixed(1)} days`;
};

const LifecycleDurationChart = ({ data }: LifecycleDurationChartProps) => {
  const { avgTimeToAssign, avgTimeToComplete, avgTotalResolution, completedCount, assignedCount } = data;

  const chartData = [
    { 
      name: 'Lodged → Assigned', 
      hours: avgTimeToAssign,
      fill: 'hsl(var(--primary))'
    },
    { 
      name: 'Assigned → Completed', 
      hours: avgTimeToComplete,
      fill: 'hsl(var(--chart-2))'
    },
  ];

  const hasData = completedCount > 0 || assignedCount > 0;

  if (!hasData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Clock className="h-5 w-5" />
            Request Lifecycle Duration
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-8 text-center">
          <p className="text-muted-foreground">
            No completed or assigned requests to analyze yet.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Clock className="h-5 w-5" />
          Request Lifecycle Duration
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="bg-muted/50 rounded-lg p-4 text-center">
            <p className="text-sm text-muted-foreground mb-1">Avg Time to Assign</p>
            <p className="text-2xl font-bold text-primary">
              {assignedCount > 0 ? formatDuration(avgTimeToAssign) : 'N/A'}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {assignedCount} assigned
            </p>
          </div>
          <div className="bg-muted/50 rounded-lg p-4 text-center">
            <p className="text-sm text-muted-foreground mb-1">Avg Time to Complete</p>
            <p className="text-2xl font-bold" style={{ color: 'hsl(var(--chart-2))' }}>
              {completedCount > 0 ? formatDuration(avgTimeToComplete) : 'N/A'}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {completedCount} completed
            </p>
          </div>
          <div className="bg-muted/50 rounded-lg p-4 text-center">
            <p className="text-sm text-muted-foreground mb-1">Avg Total Resolution</p>
            <p className="text-2xl font-bold text-foreground">
              {completedCount > 0 ? formatDuration(avgTotalResolution) : 'N/A'}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              end-to-end
            </p>
          </div>
        </div>

        {/* Timeline Visualization */}
        <div className="flex items-center justify-center gap-2 mb-6 text-sm text-muted-foreground">
          <span className="px-3 py-1 bg-muted rounded">Lodged</span>
          <ArrowRight className="h-4 w-4" />
          <span className="px-3 py-1 bg-primary/10 text-primary rounded">
            {assignedCount > 0 ? formatDuration(avgTimeToAssign) : '—'}
          </span>
          <ArrowRight className="h-4 w-4" />
          <span className="px-3 py-1 bg-muted rounded">Assigned</span>
          <ArrowRight className="h-4 w-4" />
          <span className="px-3 py-1 rounded" style={{ backgroundColor: 'hsl(var(--chart-2) / 0.1)', color: 'hsl(var(--chart-2))' }}>
            {completedCount > 0 ? formatDuration(avgTimeToComplete) : '—'}
          </span>
          <ArrowRight className="h-4 w-4" />
          <span className="px-3 py-1 bg-muted rounded">Completed</span>
        </div>

        {/* Bar Chart */}
        {(assignedCount > 0 || completedCount > 0) && (
          <div className="h-[120px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 120, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis 
                  type="number" 
                  tickFormatter={(value) => formatDuration(value)}
                  fontSize={12}
                />
                <YAxis 
                  type="category" 
                  dataKey="name" 
                  fontSize={12}
                  width={110}
                />
                <Tooltip 
                  formatter={(value: number) => [formatDuration(value), 'Duration']}
                  contentStyle={{
                    backgroundColor: 'hsl(var(--popover))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                />
                <Bar dataKey="hours" radius={[0, 4, 4, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default LifecycleDurationChart;
