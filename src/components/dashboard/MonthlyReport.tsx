import { getMonthlyReportData } from '@/lib/services/reports-data';
import ReportCard from './ReportCard';
import PieChartWithFilter from '@/components/charts/PieChartWithFilter';
import { formatCurrency } from '@/lib/utils';
import { format } from 'date-fns';

interface Props {
  date: Date;
}

export default async function MonthlyReport({ date }: Props) {
  const data = await getMonthlyReportData(date);

  // 현재 날짜 정보 (당월 기간 표시용)
  const isCurrentMonth = format(date, 'yyyy-MM') === format(new Date(), 'yyyy-MM');
  const periodDisplay = isCurrentMonth 
    ? `${data.month}-01 ~ ${format(new Date(), 'yyyy-MM-dd')}`
    : data.month;

  return (
    <ReportCard title="월간 매출 리포트" date={periodDisplay}>
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

        {/* 목표 달성률 */}
        <div className="space-y-3">
          <h3 className="font-semibold text-lg border-b pb-2">목표 대비 달성률</h3>
          <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg space-y-4">
            <div className="flex justify-between items-end">
              <div>
                <p className="text-sm text-gray-500 font-medium">목표 매출</p>
                <p className="text-lg font-bold">₩{formatCurrency(data.targetSales)}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-500 font-medium">현재 달성률</p>
                <p className="text-2xl font-black text-blue-600">{data.achievementRate}%</p>
              </div>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4 overflow-hidden">
              <div 
                className="bg-blue-600 h-full transition-all duration-500 ease-out"
                style={{ width: `${Math.min(data.achievementRate, 100)}%` }}
              ></div>
            </div>
          </div>
        </div>



        {/* 채널별 매출 현황 */}
        <div className="space-y-3">
          <h3 className="font-semibold text-lg border-b pb-2">채널별 매출 현황</h3>
          <div className="flex flex-col md:flex-row items-center justify-start gap-0">
            <div className="w-full md:w-3/5 h-[220px]">
              <PieChartWithFilter data={[
                { name: 'POS', value: data.channelSales.posSales },
                { name: '배민', value: data.channelSales.baeminSales },
                { name: '쿠팡', value: data.channelSales.coupangSales },
                { name: '기타/수기', value: data.channelSales.manualSales },
              ].filter(c => c.value > 0)} />
            </div>
            <div className="w-full md:w-2/5 px-4">
              <ul className="space-y-3 text-sm">
                <li className="flex justify-between items-center py-1 border-b border-slate-50">
                  <span className="text-gray-500 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#0088FE]"></span>
                    POS 매출
                  </span>
                  <span className="font-bold">₩{formatCurrency(data.channelSales.posSales)}</span>
                </li>
                <li className="flex justify-between items-center py-1 border-b border-slate-50">
                  <span className="text-gray-500 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#00C49F]"></span>
                    배달의민족
                  </span>
                  <span className="font-bold">₩{formatCurrency(data.channelSales.baeminSales)}</span>
                </li>
                <li className="flex justify-between items-center py-1 border-b border-slate-50">
                  <span className="text-gray-500 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#FFBB28]"></span>
                    쿠팡이츠
                  </span>
                  <span className="font-bold">₩{formatCurrency(data.channelSales.coupangSales)}</span>
                </li>
                <li className="flex justify-between items-center py-1">
                  <span className="text-gray-500 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#FF8042]"></span>
                    기타/수기
                  </span>
                  <span className="font-bold">₩{formatCurrency(data.channelSales.manualSales)}</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* 상품 분석 섹션 (좌측 차트, 우측 테이블) */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 items-start">
          {/* 상품별 비중 차트 */}
          <div className="space-y-3">
            <h3 className="font-semibold text-lg border-b pb-2">상품별 매출 비중 (TOP 5)</h3>
            <div className="h-[300px] w-full pt-4 bg-white dark:bg-gray-900/50 rounded-lg">
              <PieChartWithFilter data={data.topItems} />
            </div>
          </div>

          {/* 상세 테이블 */}
          <div className="space-y-3">
            <h3 className="font-semibold text-lg border-b pb-2">주요 상품 현황</h3>
            <div className="border rounded-lg overflow-hidden bg-white dark:bg-slate-950">
              <table className="w-full text-sm table-fixed">
                <thead className="bg-gray-50 dark:bg-gray-900">
                  <tr>
                    {/* 너비를 w-16, w-auto 등으로 명확히 배분 */}
                    <th className="w-4 px-4 py-3 text-center font-bold text-gray-700 dark:text-gray-300">순위</th>
                    <th className="w-10 px-4 py-3 text-left font-bold text-gray-700 dark:text-gray-300">상품명</th>
                    <th className="w-10 px-4 py-3 text-center font-bold text-gray-700 dark:text-gray-300">매출액</th>
                  </tr>
                </thead>
                <tbody>
                  {data.topItems.map((item, index) => (
                    <tr key={index} className="border-t hover:bg-gray-50 dark:hover:bg-slate-900 transition-colors">
                      {/* 정렬을 th와 일치시킴 */}
                      <td className="w-10 px-4 py-3 text-center font-medium text-gray-500">{index + 1}</td>
                      <td className="w-10 px-4 py-3 text-left font-medium truncate">{item.name}</td>
                      <td className="w-10 px-20 py-3 text-right font-bold text-blue-600">₩{formatCurrency(item.value)}</td>
                    </tr>
                  ))}
                  {data.topItems.length === 0 && (
                    <tr>
                      <td colSpan={3} className="px-4 py-10 text-center text-muted-foreground italic">
                        데이터가 없습니다.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </ReportCard>
  );
}
