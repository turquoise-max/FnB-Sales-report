import { getWeeklyReportData } from '@/lib/reports-data';
import ReportCard from './ReportCard';
import SalesLineChart from '@/components/charts/LineChart';

interface Props {
  date: Date;
}

export default async function WeeklyReport({ date }: Props) {
  const data = await getWeeklyReportData(date);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ko-KR').format(amount);
  };

  return (
    <ReportCard title="주간 매출 리포트" date={data.period}>
      <div className="space-y-6">
        {/* 요약 */}
        <div className="grid grid-cols-3 gap-4">
          <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
            <p className="text-sm text-gray-500">이번 주 매출</p>
            <p className="text-xl font-bold">₩{formatCurrency(data.totalSales)}</p>
          </div>
          <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
            <p className="text-sm text-gray-500">일평균 매출</p>
            <p className="text-xl font-bold">₩{formatCurrency(data.dailyAvg)}</p>
          </div>
          <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
            <p className="text-sm text-gray-500">전주 대비</p>
            <p className={`text-xl font-bold ${parseFloat(data.growthRate) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {data.growthRate}%
            </p>
          </div>
        </div>

        {/* 주간 추이 차트 */}
        <div className="space-y-2">
          <h3 className="font-semibold text-lg">일별 매출 추이</h3>
          <div className="h-[300px]">
            <SalesLineChart data={data.dailyTrend} xKey="date" yKey="sales" />
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
