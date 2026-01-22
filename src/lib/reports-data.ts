import { supabase } from './supabaseClient';
import { format, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subMonths, subWeeks } from 'date-fns';

// 일일 리포트 데이터
export async function getDailyReportData(date: Date) {
  const targetDate = format(date, 'yyyy-MM-dd');
  const prevDate = format(subDays(date, 1), 'yyyy-MM-dd');

  // 1. 해당 일자 매출 요약
  const { data: summaryData } = await supabase
    .from('daily_summary')
    .select('*')
    .eq('sale_date', targetDate)
    .single();

  const { data: prevSummaryData } = await supabase
    .from('daily_summary')
    .select('total_sales')
    .eq('sale_date', prevDate)
    .single();

  const totalSales = summaryData?.total_sales || 0;
  const prevSales = prevSummaryData?.total_sales || 0;
  const salesChange = prevSales === 0 ? (totalSales > 0 ? 100 : 0) : ((totalSales - prevSales) / prevSales) * 100;

  // 2. 시간대별 매출 (피크 타임 분석)
  const { data: hourlyData } = await supabase
    .from('sales_records')
    .select('payment_time, net_amount')
    .eq('sale_date', targetDate);

  const hourlySales = Array.from({ length: 24 }, (_, i) => ({ hour: i, sales: 0 }));
  hourlyData?.forEach(record => {
    if (record.payment_time) {
      const hour = parseInt(record.payment_time.split(':')[0], 10);
      if (hour >= 0 && hour < 24) hourlySales[hour].sales += record.net_amount;
    }
  });
  
  const peakTime = hourlySales.reduce((max, curr) => curr.sales > max.sales ? curr : max, { hour: -1, sales: 0 });

  // 3. 베스트 상품 TOP 5
  const { data: topItems } = await supabase
    .from('sales_records')
    .select('item_name, quantity, net_amount')
    .eq('sale_date', targetDate);

  const itemMap = topItems?.reduce((acc, curr) => {
    if (!acc[curr.item_name]) acc[curr.item_name] = { quantity: 0, amount: 0 };
    acc[curr.item_name].quantity += curr.quantity;
    acc[curr.item_name].amount += curr.net_amount;
    return acc;
  }, {} as Record<string, { quantity: number; amount: number }>) || {};

  const bestSellers = Object.entries(itemMap)
    .sort(([, a], [, b]) => b.quantity - a.quantity)
    .slice(0, 5)
    .map(([name, stat]) => ({ name, ...stat }));

  return {
    date: targetDate,
    summary: {
      totalSales,
      posSales: summaryData?.pos_sales || 0,
      manualSales: summaryData?.manual_sales || 0,
      salesChange: salesChange.toFixed(1),
    },
    peakTime: peakTime.hour !== -1 ? `${peakTime.hour}시` : '-',
    bestSellers,
  };
}

// 주간 리포트 데이터
export async function getWeeklyReportData(date: Date) {
  const start = format(startOfWeek(date, { weekStartsOn: 1 }), 'yyyy-MM-dd');
  const end = format(endOfWeek(date, { weekStartsOn: 1 }), 'yyyy-MM-dd');
  
  const prevStart = format(startOfWeek(subWeeks(date, 1), { weekStartsOn: 1 }), 'yyyy-MM-dd');
  const prevEnd = format(endOfWeek(subWeeks(date, 1), { weekStartsOn: 1 }), 'yyyy-MM-dd');

  // 이번 주 매출 합계
  const { data: currentData } = await supabase
    .from('daily_summary')
    .select('total_sales, sale_date')
    .gte('sale_date', start)
    .lte('sale_date', end);

  // 저번 주 매출 합계
  const { data: prevData } = await supabase
    .from('daily_summary')
    .select('total_sales')
    .gte('sale_date', prevStart)
    .lte('sale_date', prevEnd);

  const currentTotal = currentData?.reduce((sum, d) => sum + d.total_sales, 0) || 0;
  const prevTotal = prevData?.reduce((sum, d) => sum + d.total_sales, 0) || 0;
  const growthRate = prevTotal === 0 ? (currentTotal > 0 ? 100 : 0) : ((currentTotal - prevTotal) / prevTotal) * 100;

  // 요일별 매출 평균
  const dailyAvg = currentData && currentData.length > 0 ? Math.round(currentTotal / currentData.length) : 0;

  return {
    period: `${start} ~ ${end}`,
    totalSales: currentTotal,
    prevTotalSales: prevTotal,
    growthRate: growthRate.toFixed(1),
    dailyAvg,
    dailyTrend: currentData?.map(d => ({ date: d.sale_date, sales: d.total_sales })) || [],
  };
}

// 월간 리포트 데이터
export async function getMonthlyReportData(date: Date) {
  const start = format(startOfMonth(date), 'yyyy-MM-dd');
  const end = format(endOfMonth(date), 'yyyy-MM-dd');
  
  const prevStart = format(startOfMonth(subMonths(date, 1)), 'yyyy-MM-dd');
  const prevEnd = format(endOfMonth(subMonths(date, 1)), 'yyyy-MM-dd');

  // 이번 달 매출
  const { data: currentData } = await supabase
    .from('daily_summary')
    .select('total_sales')
    .gte('sale_date', start)
    .lte('sale_date', end);

  // 저번 달 매출
  const { data: prevData } = await supabase
    .from('daily_summary')
    .select('total_sales')
    .gte('sale_date', prevStart)
    .lte('sale_date', prevEnd);

  const currentTotal = currentData?.reduce((sum, d) => sum + d.total_sales, 0) || 0;
  const prevTotal = prevData?.reduce((sum, d) => sum + d.total_sales, 0) || 0;
  const growthRate = prevTotal === 0 ? (currentTotal > 0 ? 100 : 0) : ((currentTotal - prevTotal) / prevTotal) * 100;

  // 상품별 매출 비중 (Top 5)
  const { data: items } = await supabase
    .from('sales_records')
    .select('item_name, net_amount')
    .gte('sale_date', start)
    .lte('sale_date', end);

  const itemMap = items?.reduce((acc, curr) => {
    if (!acc[curr.item_name]) acc[curr.item_name] = 0;
    acc[curr.item_name] += curr.net_amount;
    return acc;
  }, {} as Record<string, number>) || {};

  const topItems = Object.entries(itemMap)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([name, value]) => ({ name, value }));

  return {
    month: format(date, 'yyyy-MM'),
    totalSales: currentTotal,
    prevTotalSales: prevTotal,
    growthRate: growthRate.toFixed(1),
    topItems,
  };
}
