import { supabase } from '../database/supabaseClient';
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

  // 08:00 ~ 20:00 범위로 필터링 및 시간 포맷팅
  const filteredHourlySales = hourlySales
    .filter(h => h.hour >= 8 && h.hour <= 20)
    .map(h => ({ ...h, hour: `${String(h.hour).padStart(2, '0')}:00` }));

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
    hourlySales: filteredHourlySales,
    bestSellers,
  };
}

// 주간 리포트 데이터
export async function getWeeklyReportData(date: Date) {
  const weekStart = startOfWeek(date, { weekStartsOn: 1 });
  const start = format(weekStart, 'yyyy-MM-dd');
  const end = format(endOfWeek(date, { weekStartsOn: 1 }), 'yyyy-MM-dd');
  
  const prevWeekStart = startOfWeek(subWeeks(date, 1), { weekStartsOn: 1 });
  const prevStart = format(prevWeekStart, 'yyyy-MM-dd');
  const prevEnd = format(endOfWeek(subWeeks(date, 1), { weekStartsOn: 1 }), 'yyyy-MM-dd');

  // 이번 주 매출 상세
  const { data: currentData } = await supabase
    .from('daily_summary')
    .select('*')
    .gte('sale_date', start)
    .lte('sale_date', end)
    .order('sale_date', { ascending: true });

  // 저번 주 매출 상세
  const { data: prevData } = await supabase
    .from('daily_summary')
    .select('*')
    .gte('sale_date', prevStart)
    .lte('sale_date', prevEnd)
    .order('sale_date', { ascending: true });

  const currentTotal = currentData?.reduce((sum, d) => sum + d.total_sales, 0) || 0;
  const prevTotal = prevData?.reduce((sum, d) => sum + d.total_sales, 0) || 0;
  const growthRate = prevTotal === 0 ? (currentTotal > 0 ? 100 : 0) : ((currentTotal - prevTotal) / prevTotal) * 100;
  
  // 일평균 매출
  const dailyAvg = currentData && currentData.length > 0 ? Math.round(currentTotal / currentData.length) : 0;

  // 요일별 비교 데이터 생성 (월~일)
  const dayNames = ['월', '화', '수', '목', '금', '토', '일'];
  const comparisonData = dayNames.map((name, index) => {
    const currDay = currentData?.find(d => new Date(d.sale_date).getDay() === (index + 1) % 7);
    const prevDay = prevData?.find(d => new Date(d.sale_date).getDay() === (index + 1) % 7);
    return {
      day: name,
      thisWeek: currDay?.total_sales || 0,
      lastWeek: prevDay?.total_sales || 0,
    };
  });

  const posSales = currentData?.reduce((sum, d) => sum + (d.pos_sales || 0), 0) || 0;
  const baeminSales = currentData?.reduce((sum, d) => sum + (d.baemin_sales || 0), 0) || 0;
  const coupangSales = currentData?.reduce((sum, d) => sum + (d.coupang_sales || 0), 0) || 0;
  const manualSales = currentData?.reduce((sum, d) => sum + (d.manual_sales || 0), 0) || 0;

  return {
    period: `${start} ~ ${end}`,
    totalSales: currentTotal,
    prevTotalSales: prevTotal,
    growthRate: growthRate.toFixed(1),
    channelSales: {
      posSales,
      baeminSales,
      coupangSales,
      manualSales,
    },
    comparisonData,
    dailyAvg, // 추가
  };
}

// 월간 리포트 데이터
export async function getMonthlyReportData(date: Date) {
  const monthStartStr = format(startOfMonth(date), 'yyyy-MM-dd');
  const monthEndStr = format(endOfMonth(date), 'yyyy-MM-dd');
  
  const prevMonthStartStr = format(startOfMonth(subMonths(date, 1)), 'yyyy-MM-dd');
  const prevMonthEndStr = format(endOfMonth(subMonths(date, 1)), 'yyyy-MM-dd');

  // 이번 달 매출
  const { data: currentData } = await supabase
    .from('daily_summary')
    .select('*')
    .gte('sale_date', monthStartStr)
    .lte('sale_date', monthEndStr);

  // 저번 달 매출
  const { data: prevData } = await supabase
    .from('daily_summary')
    .select('total_sales')
    .gte('sale_date', prevMonthStartStr)
    .lte('sale_date', prevMonthEndStr);

  // KPI 목표 조회
  const { data: kpiData } = await supabase
    .from('kpi_targets')
    .select('sales_target')
    .eq('target_month', monthStartStr)
    .single();

  const currentTotal = currentData?.reduce((sum, d) => sum + d.total_sales, 0) || 0;
  const prevTotal = prevData?.reduce((sum, d) => sum + d.total_sales, 0) || 0;
  const growthRate = prevTotal === 0 ? (currentTotal > 0 ? 100 : 0) : ((currentTotal - prevTotal) / prevTotal) * 100;
  const targetSales = kpiData?.sales_target || 0;

  // 상품별 매출 비중 (Top 5)
  const { data: items } = await supabase
    .from('sales_items')
    .select('item_name, total_amount')
    .gte('sale_date', monthStartStr)
    .lte('sale_date', monthEndStr);

  const itemMap = items?.reduce((acc, curr) => {
    if (!acc[curr.item_name]) acc[curr.item_name] = 0;
    acc[curr.item_name] += (curr.total_amount || 0);
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
    targetSales,
    achievementRate: targetSales > 0 ? Math.round((currentTotal / targetSales) * 100) : 0,
    channelSales: {
      posSales,
      baeminSales,
      coupangSales,
      manualSales,
    },
    topItems,
  };
}
