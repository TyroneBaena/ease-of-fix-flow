import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer } from '@/components/ui/chart';
import { Bar, BarChart, XAxis, YAxis, ResponsiveContainer, Cell } from 'recharts';
import { Calendar, TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface TimeBasedInsightsProps {
  data: {
    thisMonth: number;
    lastMonth: number;
    thisWeek: number;
    lastWeek: number;
    peakDays: { day: string; count: number }[];
  };
}

const chartConfig = {
  count: {
    label: 'Requests',
    color: 'hsl(var(--primary))',
  },
};

const ComparisonCard = ({ 
  label, 
  current, 
  previous, 
  periodLabel 
}: { 
  label: string; 
  current: number; 
  previous: number; 
  periodLabel: string;
}) => {
  const change = previous > 0 ? ((current - previous) / previous) * 100 : 0;
  const isIncrease = change > 0;
  const isDecrease = change < 0;
  
  return (
    <div className="flex flex-col gap-1 p-3 rounded-lg bg-muted/50">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-bold">{current}</span>
        {previous > 0 && (
          <div className={`flex items-center gap-1 text-xs font-medium ${
            isIncrease ? 'text-amber-600' : isDecrease ? 'text-green-600' : 'text-muted-foreground'
          }`}>
            {isIncrease ? (
              <TrendingUp className="h-3 w-3" />
            ) : isDecrease ? (
              <TrendingDown className="h-3 w-3" />
            ) : (
              <Minus className="h-3 w-3" />
            )}
            <span>{Math.abs(Math.round(change))}%</span>
          </div>
        )}
      </div>
      <span className="text-xs text-muted-foreground">
        vs {previous} {periodLabel}
      </span>
    </div>
  );
};

const TimeBasedInsights = ({ data }: TimeBasedInsightsProps) => {
  const maxCount = Math.max(...data.peakDays.map(d => d.count), 1);
  const peakDay = data.peakDays.reduce((max, day) => 
    day.count > max.count ? day : max, 
    { day: 'N/A', count: 0 }
  );

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-muted-foreground" />
          <CardTitle className="text-lg font-semibold">Time Insights</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Comparison Cards */}
        <div className="grid grid-cols-2 gap-3">
          <ComparisonCard 
            label="This Month"
            current={data.thisMonth}
            previous={data.lastMonth}
            periodLabel="last month"
          />
          <ComparisonCard 
            label="This Week"
            current={data.thisWeek}
            previous={data.lastWeek}
            periodLabel="last week"
          />
        </div>

        {/* Peak Days Chart */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Requests by Day</span>
            <span className="text-xs text-muted-foreground">
              Peak: {peakDay.day} ({peakDay.count})
            </span>
          </div>
          <ChartContainer config={chartConfig} className="h-[80px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.peakDays} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                <XAxis 
                  dataKey="day" 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                />
                <YAxis hide />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {data.peakDays.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.count === peakDay.count 
                        ? 'hsl(var(--primary))' 
                        : `hsl(var(--primary) / ${0.3 + (entry.count / maxCount) * 0.4})`
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </div>
      </CardContent>
    </Card>
  );
};

export default TimeBasedInsights;
