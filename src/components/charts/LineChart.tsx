'use client';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface LineChartProps {
  data: any[];
  xKey?: string;
  yKey?: string;
  lines?: { key: string; color: string; name: string }[]; // 멀티 라인 지원용
}

export default function SalesLineChart({ data, xKey = 'date', yKey = 'sales', lines }: LineChartProps) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 25 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey={xKey} height={50} tick={{ fontSize: 12 }} />
        <YAxis />
        <Tooltip formatter={(value: any) => 
          typeof value === 'number' ? `₩${value.toLocaleString('ko-KR')}` : value
        } />
        <Legend />
        {lines ? (
          lines.map((line) => (
            <Line 
              key={line.key}
              type="monotone" 
              dataKey={line.key} 
              stroke={line.color} 
              name={line.name}
              activeDot={{ r: 8 }} 
            />
          ))
        ) : (
          <Line type="monotone" dataKey={yKey} stroke="#8884d8" activeDot={{ r: 8 }} name="매출" />
        )}
      </LineChart>
    </ResponsiveContainer>
  );
}
