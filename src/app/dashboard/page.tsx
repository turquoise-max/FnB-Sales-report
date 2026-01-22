import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getKpiData, getChartData, getBestSellers, getTrendData, getItemPieChartData, getHourlySalesData } from '@/lib/dashboard-data';
import SalesLineChart from '@/components/charts/LineChart';
import PieChartWithFilter from '@/components/charts/PieChartWithFilter';
import { TrendingUp, TrendingDown } from 'lucide-react';

export default async function DashboardPage() {
  const kpiData = await getKpiData();
  const chartData = await getChartData();
  const bestSellers = await getBestSellers();
  const trendData = await getTrendData();
  const itemPieData = await getItemPieChartData();
  const hourlyData = await getHourlySalesData();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ko-KR').format(amount);
  };

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-3xl font-bold mb-6">대시보드</h1>
      
      {/* KPI Cards - 첫 번째 줄 */}
      <div className="grid gap-4 md:grid-cols-3 mb-4">
        <Card>
          <CardHeader>
            <CardTitle>오늘 총 매출</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">₩{formatCurrency(kpiData.todaySales)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>전일 대비</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <p className={`text-2xl font-bold ${parseFloat(kpiData.salesChange) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {kpiData.salesChange}%
              </p>
              {parseFloat(kpiData.salesChange) >= 0 ? (
                <TrendingUp className="text-green-600" size={24} />
              ) : (
                <TrendingDown className="text-red-600" size={24} />
              )}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>이번 달 누적 매출</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">₩{formatCurrency(kpiData.monthTotal)}</p>
          </CardContent>
        </Card>
      </div>

      {/* 주별/월별 증감률 Cards - 두 번째 줄 */}
      <div className="grid gap-4 md:grid-cols-2 mb-6">
        <Card>
          <CardHeader>
            <CardTitle>주별 매출 증감률</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">이번 주</span>
                <span className="font-semibold">₩{formatCurrency(trendData.thisWeekSales)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">저번 주</span>
                <span>₩{formatCurrency(trendData.lastWeekSales)}</span>
              </div>
              <div className="flex items-center gap-2 pt-2 border-t">
                <p className={`text-xl font-bold ${parseFloat(trendData.weeklyChange) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {trendData.weeklyChange}%
                </p>
                {parseFloat(trendData.weeklyChange) >= 0 ? (
                  <TrendingUp className="text-green-600" size={20} />
                ) : (
                  <TrendingDown className="text-red-600" size={20} />
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>월별 매출 증감률</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">이번 달</span>
                <span className="font-semibold">₩{formatCurrency(trendData.thisMonthSales)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">저번 달</span>
                <span>₩{formatCurrency(trendData.lastMonthSales)}</span>
              </div>
              <div className="flex items-center gap-2 pt-2 border-t">
                <p className={`text-xl font-bold ${parseFloat(trendData.monthlyChange) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {trendData.monthlyChange}%
                </p>
                {parseFloat(trendData.monthlyChange) >= 0 ? (
                  <TrendingUp className="text-green-600" size={20} />
                ) : (
                  <TrendingDown className="text-red-600" size={20} />
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 중간 영역: 차트 */}
      <div className="grid gap-6 md:grid-cols-2 mb-6">
        {/* 오늘 시간대별 매출 차트 (신규) */}
        <Card>
          <CardHeader>
            <CardTitle>오늘 시간대별 매출</CardTitle>
          </CardHeader>
          <CardContent>
            <SalesLineChart data={hourlyData} xKey="hour" yKey="sales" />
          </CardContent>
        </Card>

        {/* 일별 매출 추이 (기존 유지) */}
        <Card>
          <CardHeader>
            <CardTitle>일별 매출 추이 (최근 30일)</CardTitle>
          </CardHeader>
          <CardContent>
            <SalesLineChart data={chartData.lineChartData} xKey="date" yKey="sales" />
          </CardContent>
        </Card>
      </div>
      
      {/* 하단 영역: 상품 분석 */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* 상품별 매출 비중 (기타 제외 상위 항목만) */}
        <Card>
          <CardHeader>
            <CardTitle>상품별 매출 비중 (TOP 10)</CardTitle>
          </CardHeader>
          <CardContent>
            <PieChartWithFilter data={itemPieData} />
          </CardContent>
        </Card>

        {/* 베스트 메뉴 TOP 5 (기존 유지) */}
        <Card>
          <CardHeader>
            <CardTitle>베스트 메뉴 TOP 5 (판매량 기준)</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {bestSellers.map((item, index) => (
                <li key={item.name} className="flex justify-between items-center p-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded">
                  <span className="flex items-center gap-2">
                    <span className="flex items-center justify-center w-6 h-6 bg-blue-100 text-blue-800 rounded-full text-sm font-bold">
                      {index + 1}
                    </span>
                    {item.name}
                  </span>
                  <span className="font-semibold">{item.quantity}개</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
