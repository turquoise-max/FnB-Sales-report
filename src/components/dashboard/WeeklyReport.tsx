import { getWeeklyReportData } from '@/lib/services/reports-data';
import ReportCard from './ReportCard';
import SalesLineChart from '@/components/charts/LineChart';
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

        {/* 채널별 매출 상세 */}
        <div className="space-y-3">
          <h3 className="font-semibold text-lg border-b pb-2">채널별 매출 현황</h3>
          <ul className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
            <li className="flex justify-between">
              <span className="text-gray-500">POS 매출</span>
              <span className="font-medium">₩{formatCurrency(data.channelSales.posSales)}</span>
            </li>
            <li className="flex justify-between">
              <span className="text-gray-500">배달의민족</span>
              <span className="font-medium">₩{formatCurrency(data.channelSales.baeminSales)}</span>
            </li>
            <li className="flex justify-between">
              <span className="text-gray-500">쿠팡이츠</span>
              <span className="font-medium">₩{formatCurrency(data.channelSales.coupangSales)}</span>
            </li>
            <li className="flex justify-between">
              <span className="text-gray-500">수기 매출</span>
              <span className="font-medium">₩{formatCurrency(data.channelSales.manualSales)}</span>
            </li>
          </ul>
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
