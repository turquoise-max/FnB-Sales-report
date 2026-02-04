import { getDailyReportData } from '@/lib/services/reports-data';
import ReportCard from './ReportCard';
import { format } from 'date-fns';
import SalesLineChart from '@/components/charts/LineChart';
import { formatCurrency } from '@/lib/utils';

interface Props {
  date: Date;
}

export default async function DailyReport({ date }: Props) {
  const data = await getDailyReportData(date);
  const formattedDate = format(date, 'yyyy년 MM월 dd일');

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

        {/* 채널별 매출 상세 */}
        <div className="space-y-3">
          <h3 className="font-semibold text-lg border-b pb-2">채널별 매출 현황</h3>
          <ul className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
            <li className="flex justify-between">
              <span className="text-gray-500">POS 매출</span>
              <span className="font-medium">₩{formatCurrency(data.summary.posSales)}</span>
            </li>
            <li className="flex justify-between">
              <span className="text-gray-500">배달의민족</span>
              <span className="font-medium">₩{formatCurrency(data.summary.baeminSales)}</span>
            </li>
            <li className="flex justify-between">
              <span className="text-gray-500">쿠팡이츠</span>
              <span className="font-medium">₩{formatCurrency(data.summary.coupangSales)}</span>
            </li>
            <li className="flex justify-between">
              <span className="text-gray-500">수기 매출</span>
              <span className="font-medium">₩{formatCurrency(data.summary.manualSales)}</span>
            </li>
          </ul>
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
