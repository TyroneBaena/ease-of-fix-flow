
import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

// Sample data
import { requests } from '@/data/sampleData';

const CategoryChart = () => {
  // Calculate category counts
  const categoryCountsMap = requests.reduce((acc, request) => {
    const category = request.category.toLowerCase();
    acc[category] = (acc[category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  // Convert to array and sort by count
  const data = Object.entries(categoryCountsMap)
    .map(([name, value]) => ({ 
      name: name.charAt(0).toUpperCase() + name.slice(1),
      value 
    }))
    .sort((a, b) => b.value - a.value);

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 5, right: 30, left: 50, bottom: 5 }}
      >
        <XAxis type="number" hide />
        <YAxis type="category" dataKey="name" width={80} />
        <Tooltip formatter={(value: number) => [`${value} requests`, 'Count']} />
        <Bar dataKey="value" fill="#3B82F6" radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
};

export default CategoryChart;
