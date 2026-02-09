import { getWeeklyReportData } from '@/lib/services/reports-data';
import ReportCard from './ReportCard';
import SalesLineChart from '@/components/charts/LineChart';
import PieChartWithFilter from '@/components/charts/PieChartWithFilter';
import { formatCurrency } from '@/lib/utils';

interface Props {
  date: Date;
}

export default async function WeeklyReport({ date }: Props) {
  const data = await getWeeklyReportData(date);

  return (
    <ReportCard title="주간 매출 리포트" date={data.period}>
      <div className="space-y-6">
        {/* 요약 */}
        <div className="grid grid-cols-3 gap-4">
          <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
            <p className="text-sm text-gray-500 font-medium">이번 주 매출</p>
            <p className="text-xl font-bold">₩{formatCurrency(data.totalSales)}</p>
          </div>
          <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
            <p className="text-sm text-gray-500 font-medium">일평균 매출</p>
            <p className="text-xl font-bold">₩{formatCurrency(data.dailyAvg)}</p>
          </div>
          <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
            <p className="text-sm text-gray-500 font-medium">전주 대비</p>
            <p
              className={`text-xl font-bold ${
                parseFloat(data.growthRate) >= 0 ? 'text-green-600' : 'text-red-600'
              }`}
            >
              {data.growthRate}%
            </p>
          </div>
        </div>

        {/* 채널별 매출 현황 */}
        <div className="space-y-3">
          <h3 className="font-semibold text-lg border-b pb-2 text-center md:text-left">채널별 매출 현황</h3>
          <div className="flex flex-col md:flex-row items-center justify-center gap-4">
            <div className="w-full md:w-1/2 h-[240px]">
              <PieChartWithFilter data={[
                { name: 'POS', value: data.channelSales.posSales },
                { name: '배민', value: data.channelSales.baeminSales },
                { name: '쿠팡', value: data.channelSales.coupangSales },
                { name: '기타/수기', value: data.channelSales.manualSales },
              ].filter(c => c.value > 0)} />
            </div>
            <div className="w-full md:w-1/2 max-w-[280px]">
              <ul className="space-y-2 text-sm">
                {[
                  { label: 'POS 매출', value: data.channelSales.posSales, color: '#0088FE' },
                  { label: '배달의민족', value: data.channelSales.baeminSales, color: '#00C49F' },
                  { label: '쿠팡이츠', value: data.channelSales.coupangSales, color: '#FFBB28' },
                  { label: '기타/수기', value: data.channelSales.manualSales, color: '#FF8042' },
                ].map((item) => (
                  <li key={item.label} className="flex justify-between items-center p-2 rounded-lg bg-gray-50/50 dark:bg-gray-800/50">
                    <span className="text-gray-500 flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }}></span>
                      {item.label}
                    </span>
                    <span className="font-bold">₩{formatCurrency(item.value)}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* 주간 추이 비교 차트 */}
        <div className="space-y-3">
          <h3 className="font-semibold text-lg border-b pb-2">전주 대비 요일별 매출 비교</h3>
          <div className="h-[300px] w-full pt-4">
            <SalesLineChart 
              data={data.comparisonData} 
              xKey="day" 
              lines={[
                { key: 'lastWeek', color: '#cbd5e1', name: '지난 주' },
                { key: 'thisWeek', color: '#2563eb', name: '이번 주' }
              ]} 
            />
          </div>
        </div>
        
        {/* 인사이트 (가상의 데이터) */}
        <div className="space-y-2">
          <h3 className="font-semibold text-lg">주간 분석</h3>
          <ul className="list-disc list-inside text-sm space-y-1 text-gray-600 dark:text-gray-300">
            <li>이번 주는 지난 주 대비 매출이 {parseFloat(data.growthRate) >= 0 ? '증가' : '감소'}했습니다.</li>
            <li>일평균 매출은 ₩{formatCurrency(data.dailyAvg)}입니다.</li>
          </ul>
        </div>
      </div>
    </ReportCard>
  );
}
