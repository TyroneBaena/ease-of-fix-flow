
import React from 'react';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';

// Sample data
import { requests } from '@/data/sampleData';

const StatusChart = () => {
  // Calculate status counts
  const statusCounts = requests.reduce((acc, request) => {
    acc[request.status] = (acc[request.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  const data = [
    { name: 'Open', value: statusCounts['open'] || 0, color: '#F59E0B' },
    { name: 'In Progress', value: statusCounts['in-progress'] || 0, color: '#3B82F6' },
    { name: 'Completed', value: statusCounts['completed'] || 0, color: '#10B981' },
  ];

  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          labelLine={false}
          outerRadius={80}
          fill="#8884d8"
          dataKey="value"
          nameKey="name"
          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip 
          formatter={(value: number) => [`${value} requests`, 'Count']}
        />
      </PieChart>
    </ResponsiveContainer>
  );
};

export default StatusChart;
