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

  // 2. 시간대별 매출
  // UTC 기준으로 정확한 범위를 조회하기 위해 order_at 사용
  const startKST = new Date(`${targetDate}T00:00:00+09:00`);
  const endKST = new Date(`${targetDate}T23:59:59+09:00`);

  const { data: hourlyData } = await supabase
    .from('sales_orders')
    .select('order_at, net_amount')
    .gte('order_at', startKST.toISOString())
    .lte('order_at', endKST.toISOString());

  const hourlySales = Array.from({ length: 24 }, (_, i) => ({ hour: i, sales: 0 }));
  hourlyData?.forEach(record => {
    // order_at이 UTC이므로 KST로 변환하여 시간 추출
    const kstDate = new Date(record.order_at);
    const hour = kstDate.getHours();
    if (hour >= 0 && hour < 24) {
      hourlySales[hour].sales += record.net_amount;
    }
  });
  
  const peakTime = hourlySales.reduce((max, curr) => curr.sales > max.sales ? curr : max, { hour: -1, sales: 0 });

  // 3. 베스트 상품 TOP 5
  const { data: topItems } = await supabase
    .from('sales_items')
    .select('item_name, quantity, amount')
    .eq('sale_date', targetDate);

  const itemMap = topItems?.reduce((acc, curr) => {
    if (!acc[curr.item_name]) acc[curr.item_name] = { quantity: 0, amount: 0 };
    acc[curr.item_name].quantity += curr.quantity;
    acc[curr.item_name].amount += curr.amount;
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
      baeminSales: summaryData?.baemin_sales || 0,
      coupangSales: summaryData?.coupang_sales || 0,
      manualSales: summaryData?.manual_sales || 0,
      salesChange: salesChange.toFixed(1),
    },
    peakTime: peakTime.hour !== -1 ? `${peakTime.hour}시` : '-',
    hourlySales: hourlySales.map(h => ({ ...h, hour: `${h.hour}시` })),
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
    .select('*')
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

  const posSales = currentData?.reduce((sum, d) => sum + (d.pos_sales || 0), 0) || 0;
  const baeminSales = currentData?.reduce((sum, d) => sum + (d.baemin_sales || 0), 0) || 0;
  const coupangSales = currentData?.reduce((sum, d) => sum + (d.coupang_sales || 0), 0) || 0;
  const manualSales = currentData?.reduce((sum, d) => sum + (d.manual_sales || 0), 0) || 0;

  return {
    period: `${start} ~ ${end}`,
    totalSales: currentTotal,
    prevTotalSales: prevTotal,
    growthRate: growthRate.toFixed(1),
    dailyAvg,
    channelSales: {
      posSales,
      baeminSales,
      coupangSales,
      manualSales,
    },
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
    .select('*')
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
    .from('sales_items')
    .select('item_name, amount')
    .gte('sale_date', start)
    .lte('sale_date', end);

  const itemMap = items?.reduce((acc, curr) => {
    if (!acc[curr.item_name]) acc[curr.item_name] = 0;
    acc[curr.item_name] += curr.amount;
    return acc;
  }, {} as Record<string, number>) || {};

  const topItems = Object.entries(itemMap)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([name, value]) => ({ name, value }));

  const posSales = currentData?.reduce((sum, d) => sum + (d.pos_sales || 0), 0) || 0;
  const baeminSales = currentData?.reduce((sum, d) => sum + (d.baemin_sales || 0), 0) || 0;
  const coupangSales = currentData?.reduce((sum, d) => sum + (d.coupang_sales || 0), 0) || 0;
  const manualSales = currentData?.reduce((sum, d) => sum + (d.manual_sales || 0), 0) || 0;

  return {
    month: format(date, 'yyyy-MM'),
    totalSales: currentTotal,
    prevTotalSales: prevTotal,
    growthRate: growthRate.toFixed(1),
    channelSales: {
      posSales,
      baeminSales,
      coupangSales,
      manualSales,
    },
    topItems,
  };
}
