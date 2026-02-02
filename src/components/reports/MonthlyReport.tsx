import { getMonthlyReportData } from '@/lib/reports-data';
import ReportCard from './ReportCard';
import PieChartWithFilter from '@/components/charts/PieChartWithFilter';
import { formatCurrency } from '@/lib/utils';

interface Props {
  date: Date;
}

export default async function MonthlyReport({ date }: Props) {
  const data = await getMonthlyReportData(date);

  return (
    <ReportCard title="월간 매출 리포트" date={data.month}>
      <div className="space-y-6">
        {/* 요약 */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
            <p className="text-sm text-gray-500 font-medium">이번 달 총 매출</p>
            <p className="text-2xl font-bold">₩{formatCurrency(data.totalSales)}</p>
          </div>
          <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
            <p className="text-sm text-gray-500 font-medium">전월 대비</p>
            <p
              className={`text-2xl font-bold ${
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

        {/* 상품별 비중 차트 */}
        <div className="space-y-3">
          <h3 className="font-semibold text-lg border-b pb-2">상품별 매출 비중 (TOP 5)</h3>
          <div className="h-[250px] w-full pt-4">
            <PieChartWithFilter data={data.topItems} />
          </div>
        </div>

        {/* 상세 테이블 */}
        <div className="space-y-3">
          <h3 className="font-semibold text-lg border-b pb-2">주요 상품 현황</h3>
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className="px-4 py-2 text-left">순위</th>
                  <th className="px-4 py-2 text-left">상품명</th>
                  <th className="px-4 py-2 text-right">매출액</th>
                </tr>
              </thead>
              <tbody>
                {data.topItems.map((item, index) => (
                  <tr key={index} className="border-t">
                    <td className="px-4 py-2 font-medium text-gray-500">{index + 1}</td>
                    <td className="px-4 py-2">{item.name}</td>
                    <td className="px-4 py-2 text-right">₩{formatCurrency(item.value)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </ReportCard>
  );
}
