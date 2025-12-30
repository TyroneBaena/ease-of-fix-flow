import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis
} from 'recharts';
import { FileText, Bot, QrCode, TrendingUp } from 'lucide-react';

interface SubmissionMethodData {
  form: number;
  ai_assistant: number;
  public_form: number;
  public_ai_assistant: number;
}

interface SubmissionMethodChartProps {
  data: SubmissionMethodData;
}

const METHOD_LABELS: Record<string, string> = {
  form: 'Standard Form',
  ai_assistant: 'AI Assistant',
  public_form: 'Public Form (QR)',
  public_ai_assistant: 'Public AI (QR)'
};

const METHOD_ICONS: Record<string, React.ReactNode> = {
  form: <FileText className="h-4 w-4" />,
  ai_assistant: <Bot className="h-4 w-4" />,
  public_form: <QrCode className="h-4 w-4" />,
  public_ai_assistant: <Bot className="h-4 w-4" />
};

const COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))'
];

const SubmissionMethodChart: React.FC<SubmissionMethodChartProps> = ({ data }) => {
  const total = data.form + data.ai_assistant + data.public_form + data.public_ai_assistant;
  
  if (total === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Submission Methods
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[200px] flex items-center justify-center text-muted-foreground">
            No submission data available yet
          </div>
        </CardContent>
      </Card>
    );
  }

  const pieData = [
    { name: 'Standard Form', value: data.form, key: 'form' },
    { name: 'AI Assistant', value: data.ai_assistant, key: 'ai_assistant' },
    { name: 'Public Form', value: data.public_form, key: 'public_form' },
    { name: 'Public AI', value: data.public_ai_assistant, key: 'public_ai_assistant' }
  ].filter(item => item.value > 0);

  // Calculate AI adoption rate
  const aiTotal = data.ai_assistant + data.public_ai_assistant;
  const aiAdoptionRate = total > 0 ? ((aiTotal / total) * 100).toFixed(1) : '0';
  
  // Calculate public submission rate
  const publicTotal = data.public_form + data.public_ai_assistant;
  const publicRate = total > 0 ? ((publicTotal / total) * 100).toFixed(1) : '0';

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium flex items-center gap-2">
          <FileText className="h-4 w-4" />
          Submission Methods
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid md:grid-cols-2 gap-6">
          {/* Pie Chart */}
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                  label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: number, name: string) => [value, name]}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Stats */}
          <div className="flex flex-col justify-center space-y-4">
            <div className="space-y-3">
              {pieData.map((item, index) => (
                <div key={item.key} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    />
                    <span className="text-sm">{item.name}</span>
                  </div>
                  <Badge variant="secondary">
                    {item.value} ({((item.value / total) * 100).toFixed(0)}%)
                  </Badge>
                </div>
              ))}
            </div>

            <div className="pt-4 border-t space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2">
                  <Bot className="h-4 w-4 text-primary" />
                  AI Adoption Rate
                </span>
                <Badge variant="outline" className="flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" />
                  {aiAdoptionRate}%
                </Badge>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2">
                  <QrCode className="h-4 w-4 text-primary" />
                  Public Submissions
                </span>
                <Badge variant="outline">
                  {publicRate}%
                </Badge>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default SubmissionMethodChart;
