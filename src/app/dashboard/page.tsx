import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getKpiData, getChartData, getBestSellers, getTrendData, getItemPieChartData, getHourlySalesData } from '@/lib/dashboard-data';
import SalesLineChart from '@/components/charts/LineChart';
import PieChartWithFilter from '@/components/charts/PieChartWithFilter';
import { TrendingUp, TrendingDown, Clock, Calendar, BarChart3, ShoppingBag } from 'lucide-react';

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
            <CardTitle className="text-sm font-medium text-muted-foreground">오늘 총 매출</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-slate-900">₩{formatCurrency(kpiData.todaySales)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">전일 대비</CardTitle>
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
            <CardTitle className="text-sm font-medium text-muted-foreground">이번 달 누적 매출</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-blue-600">₩{formatCurrency(kpiData.monthTotal)}</p>
          </CardContent>
        </Card>
      </div>

      {/* 주별/월별 증감률 Cards - 두 번째 줄 */}
      <div className="grid gap-4 md:grid-cols-2 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">주별 매출 분석</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-500">이번 주</span>
                <span className="font-semibold text-slate-800">₩{formatCurrency(trendData.thisWeekSales)}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-500">저번 주</span>
                <span className="text-slate-600">₩{formatCurrency(trendData.lastWeekSales)}</span>
              </div>
              <div className="flex items-center gap-2 pt-2 border-t mt-2">
                <p className={`text-xl font-bold ${parseFloat(trendData.weeklyChange) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {trendData.weeklyChange}%
                </p>
                {parseFloat(trendData.weeklyChange) >= 0 ? (
                  <TrendingUp className="text-green-600" size={20} />
                ) : (
                  <TrendingDown className="text-red-600" size={20} />
                )}
                <span className="text-xs text-muted-foreground ml-1">전주 대비</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">월별 매출 분석</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-500">이번 달</span>
                <span className="font-semibold text-slate-800">₩{formatCurrency(trendData.thisMonthSales)}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-500">저번 달</span>
                <span className="text-slate-600">₩{formatCurrency(trendData.lastMonthSales)}</span>
              </div>
              <div className="flex items-center gap-2 pt-2 border-t mt-2">
                <p className={`text-xl font-bold ${parseFloat(trendData.monthlyChange) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {trendData.monthlyChange}%
                </p>
                {parseFloat(trendData.monthlyChange) >= 0 ? (
                  <TrendingUp className="text-green-600" size={20} />
                ) : (
                  <TrendingDown className="text-red-600" size={20} />
                )}
                <span className="text-xs text-muted-foreground ml-1">전월 대비</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 분석 차트 영역 */}
      <div className="grid gap-6 md:grid-cols-2 mb-6">
        {/* 1. 시간대별 매출 분석 */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base font-semibold">오늘 시간대별 매출 추이</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <SalesLineChart data={hourlyData} xKey="hour" yKey="sales" />
            </div>
          </CardContent>
        </Card>

        {/* 2. 일별 매출 추이 */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base font-semibold">최근 30일 매출 흐름</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <SalesLineChart data={chartData.lineChartData} xKey="date" yKey="sales" />
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* 하단 영역: 상품 분석 */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* 3. 상품별 매출 비중 */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base font-semibold">상품별 매출 비중 (TOP 10)</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="h-[350px] w-full">
              <PieChartWithFilter data={itemPieData} />
            </div>
          </CardContent>
        </Card>

        {/* 4. 베스트 메뉴 순위 */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base font-semibold">인기 상품 TOP 5</CardTitle>
            <ShoppingBag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4 py-2">
              {bestSellers.length > 0 ? (
                bestSellers.map((item, index) => (
                  <div key={item.name} className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-900 rounded-lg hover:shadow-sm transition-shadow border border-slate-100">
                    <div className="flex items-center gap-3">
                      <span className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold ${
                        index === 0 ? 'bg-yellow-100 text-yellow-700' : 
                        index === 1 ? 'bg-slate-200 text-slate-700' :
                        index === 2 ? 'bg-orange-100 text-orange-700' :
                        'bg-blue-50 text-blue-600'
                      }`}>
                        {index + 1}
                      </span>
                      <span className="font-medium text-sm text-slate-700">{item.name}</span>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="font-bold text-blue-600 text-sm">{item.quantity}개</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center py-20 text-muted-foreground italic">
                  <ShoppingBag size={48} className="mb-2 opacity-20" />
                  <p>판매 데이터가 없습니다.</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}