import { getDailyReportData } from '@/lib/services/reports-data';
import ReportCard from './ReportCard';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import SalesLineChart from '@/components/charts/LineChart';
import PieChartWithFilter from '@/components/charts/PieChartWithFilter';
import { formatCurrency } from '@/lib/utils';

interface Props {
  date: Date;
}

export default async function DailyReport({ date }: Props) {
  const data = await getDailyReportData(date);
  const formattedDate = format(date, 'yyyy년 MM월 dd일 (EEE)', { locale: ko });

  // 채널별 파이차트 데이터 생성
  const channelChartData = [
    { name: 'POS', value: data.summary.posSales },
    { name: '배민', value: data.summary.baeminSales },
    { name: '쿠팡', value: data.summary.coupangSales },
    { name: '기타/수기', value: data.summary.manualSales },
  ].filter(c => c.value > 0);

  return (
    <ReportCard title="일일 매출 요약 리포트" date={formattedDate}>
      <div className="space-y-6">
        {/* 요약 */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
            <p className="text-sm text-gray-500 font-medium">총 매출</p>
            <p className="text-2xl font-bold">₩{formatCurrency(data.summary.totalSales)}</p>
          </div>
          <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
            <p className="text-sm text-gray-500 font-medium">전일 대비</p>
            <p
              className={`text-2xl font-bold ${
                parseFloat(data.summary.salesChange) >= 0 ? 'text-green-600' : 'text-red-600'
              }`}
            >
              {data.summary.salesChange}%
            </p>
          </div>
        </div>

        {/* 채널별 매출 현황 */}
        <div className="space-y-3">
          <h3 className="font-semibold text-lg border-b pb-2 text-center md:text-left">채널별 매출 현황</h3>
          <div className="flex flex-col md:flex-row items-center justify-center gap-4">
            <div className="w-full md:w-1/2 h-[240px]">
              <PieChartWithFilter data={channelChartData} />
            </div>
            <div className="w-full md:w-1/2 max-w-[280px]">
              <ul className="space-y-2 text-sm">
                {[
                  { label: 'POS 매출', value: data.summary.posSales, color: '#0088FE' },
                  { label: '배달의민족', value: data.summary.baeminSales, color: '#00C49F' },
                  { label: '쿠팡이츠', value: data.summary.coupangSales, color: '#FFBB28' },
                  { label: '기타/수기', value: data.summary.manualSales, color: '#FF8042' },
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

        {/* 시간대별 매출 추이 */}
        <div className="space-y-3">
          <h3 className="font-semibold text-lg border-b pb-2">시간대별 매출 추이</h3>
          <div className="h-[250px] w-full pt-4">
            <SalesLineChart data={data.hourlySales} xKey="hour" yKey="sales" />
          </div>
        </div>
      </div>
    </ReportCard>
  );
}
