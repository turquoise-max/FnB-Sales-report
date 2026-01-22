import { getDailyReportData } from '@/lib/reports-data';
import ReportCard from './ReportCard';
import { format } from 'date-fns';

interface Props {
  date: Date;
}

export default async function DailyReport({ date }: Props) {
  const data = await getDailyReportData(date);
  const formattedDate = format(date, 'yyyy년 MM월 dd일');

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ko-KR').format(amount);
  };

  return (
    <ReportCard title="일일 매출 요약 리포트" date={formattedDate}>
      <div className="space-y-6">
        {/* 요약 */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
            <p className="text-sm text-gray-500">총 매출</p>
            <p className="text-xl font-bold">₩{formatCurrency(data.summary.totalSales)}</p>
          </div>
          <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
            <p className="text-sm text-gray-500">전일 대비</p>
            <p className={`text-xl font-bold ${parseFloat(data.summary.salesChange) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {data.summary.salesChange}%
            </p>
          </div>
        </div>

        {/* 상세 내역 */}
        <div className="space-y-2">
          <h3 className="font-semibold text-lg">상세 현황</h3>
          <ul className="space-y-1 text-sm">
            <li className="flex justify-between">
              <span>POS 매출:</span>
              <span>₩{formatCurrency(data.summary.posSales)}</span>
            </li>
            <li className="flex justify-between">
              <span>수기 매출:</span>
              <span>₩{formatCurrency(data.summary.manualSales)}</span>
            </li>
            <li className="flex justify-between pt-2 border-t">
              <span>피크 타임:</span>
              <span className="font-medium">{data.peakTime}</span>
            </li>
          </ul>
        </div>

        {/* 베스트 상품 */}
        <div className="space-y-2">
          <h3 className="font-semibold text-lg">인기 상품 TOP 5</h3>
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className="px-4 py-2 text-left">상품명</th>
                  <th className="px-4 py-2 text-right">수량</th>
                  <th className="px-4 py-2 text-right">매출액</th>
                </tr>
              </thead>
              <tbody>
                {data.bestSellers.map((item, index) => (
                  <tr key={index} className="border-t">
                    <td className="px-4 py-2">{item.name}</td>
                    <td className="px-4 py-2 text-right">{item.quantity}</td>
                    <td className="px-4 py-2 text-right">₩{formatCurrency(item.amount)}</td>
                  </tr>
                ))}
                {data.bestSellers.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-4 py-4 text-center text-gray-500">
                      데이터가 없습니다.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </ReportCard>
  );
}
