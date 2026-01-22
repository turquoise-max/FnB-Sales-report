'use client';

import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface SimplePieChartProps {
  data: { name: string; value: number }[];
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#AF19FF', '#FF6B9D', '#36A2EB', '#4BC0C0', '#FF9F40', '#9966FF', '#CCCCCC'];

export default function PieChartWithFilter({ data }: SimplePieChartProps) {
  // 카테고리 정보가 없으므로 필터 제거하고 단일 데이터 소스(상품별)만 사용

  return (
    <div className="space-y-4">
      {/* 필터 제거됨 */}
      
      <ResponsiveContainer width="100%" height={300}>
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
            label={(entry) => `${entry.name}`}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip formatter={(value: number | undefined) => value ? `₩${value.toLocaleString('ko-KR')}` : '₩0'} />
          <Legend 
            layout="horizontal" 
            verticalAlign="bottom" 
            align="center"
            wrapperStyle={{ paddingTop: '20px', fontSize: '12px' }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
