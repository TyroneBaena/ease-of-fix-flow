import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Area, AreaChart, XAxis, YAxis, ResponsiveContainer } from 'recharts';
import { TrendingUp } from 'lucide-react';

interface RequestTrendsChartProps {
  data: { month: string; requests: number }[];
}

const chartConfig = {
  requests: {
    label: 'Requests',
    color: 'hsl(var(--primary))',
  },
};

const RequestTrendsChart = ({ data }: RequestTrendsChartProps) => {
  const total = data.reduce((sum, d) => sum + d.requests, 0);
  const firstMonth = data[0]?.requests || 0;
  const lastMonth = data[data.length - 1]?.requests || 0;
  const growth = firstMonth > 0 ? Math.round(((lastMonth - firstMonth) / firstMonth) * 100) : 0;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">Request Trends</CardTitle>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <TrendingUp className="h-4 w-4" />
            <span>Last 6 months</span>
          </div>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold">{total}</span>
          <span className="text-sm text-muted-foreground">total requests</span>
          {growth !== 0 && (
            <span className={`text-sm font-medium ${growth > 0 ? 'text-amber-600' : 'text-green-600'}`}>
              {growth > 0 ? '+' : ''}{growth}% growth
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[200px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="requestsGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis 
                dataKey="month" 
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
              />
              <YAxis 
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Area
                type="monotone"
                dataKey="requests"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                fill="url(#requestsGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
};

export default RequestTrendsChart;
