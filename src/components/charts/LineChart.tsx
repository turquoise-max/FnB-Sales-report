'use client';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface LineChartProps {
  data: any[];
  xKey?: string;
  yKey?: string;
}

export default function SalesLineChart({ data, xKey = 'date', yKey = 'sales' }: LineChartProps) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey={xKey} />
        <YAxis />
        <Tooltip formatter={(value: any) => 
          typeof value === 'number' ? `₩${value.toLocaleString('ko-KR')}` : value
        } />
        <Legend />
        <Line type="monotone" dataKey={yKey} stroke="#8884d8" activeDot={{ r: 8 }} name="매출" />
      </LineChart>
    </ResponsiveContainer>
  );
}
