/**
 * 대시보드 데이터 서비스
 * 전체 매출 지표, 차트 데이터 및 상품별 통계를 조회하는 로직을 담당합니다.
 */
import { supabase } from '../database/supabaseClient';
import { startOfMonth, subDays, format, startOfWeek, endOfWeek, subWeeks } from 'date-fns';

// 오늘 날짜를 'YYYY-MM-DD' 형식으로 가져오는 헬퍼 함수
const getToday = (date: Date = new Date()) => format(date, 'yyyy-MM-dd');

/**
 * 특정 날짜 기준의 핵심 성과 지표(KPI) 데이터를 가져옵니다.
 * (오늘 매출, 전일 대비 증감, 이번 달 누적 매출)
 */
export async function getKpiData(date: Date = new Date()) {
  const todayStr = getToday(date);
  const yesterdayStr = format(subDays(date, 1), 'yyyy-MM-dd');
  const startOfMonthStr = format(startOfMonth(new Date()), 'yyyy-MM-dd');

  // 1. 오늘 총 매출
  let todaySales = 0;
  try {
    const { data: todayData, error: todayError } = await supabase
      .from('daily_summary')
      .select('total_sales')
      .eq('sale_date', todayStr)
      .single();

    if (!todayError) {
      todaySales = todayData?.total_sales || 0;
    }
  } catch (e) {
    console.warn('Today sales fetch skipped during build or network error');
  }

  // 2. 어제 총 매출
  let yesterdaySales = 0;
  try {
    const { data: yesterdayData, error: yesterdayError } = await supabase
      .from('daily_summary')
      .select('total_sales')
      .eq('sale_date', yesterdayStr)
      .single();
    
    if (!yesterdayError) {
      yesterdaySales = yesterdayData?.total_sales || 0;
    }
  } catch (e) {
    console.warn('Yesterday sales fetch skipped during build or network error');
  }

  // 3. 이번 달 누적 매출
  const { data: monthData, error: monthError } = await supabase
    .from('daily_summary')
    .select('total_sales')
    .gte('sale_date', startOfMonthStr)
    .lte('sale_date', todayStr);

  if (monthError) {
    console.error('Error fetching month\'s sales:', monthError);
    throw new Error('이번 달 누적 매출을 가져오는 데 실패했습니다.');
  }
  const monthTotal = monthData?.reduce((sum, current) => sum + current.total_sales, 0) || 0;

  // 4. 전일 대비 증감율 계산
  const salesChange = yesterdaySales === 0
    ? (todaySales > 0 ? 100 : 0)
    : ((todaySales - yesterdaySales) / yesterdaySales) * 100;

  return {
    todaySales,
    salesChange: salesChange.toFixed(1), // 소수점 첫째 자리까지
    monthTotal,
  };
}

/**
 * 대시보드용 차트 데이터를 가져옵니다.
 * (최근 30일 일별 매출 추이)
 */
export async function getChartData(date: Date = new Date()) {
  const thirtyDaysAgoStr = format(subDays(date, 30), 'yyyy-MM-dd');
  const todayStr = getToday(date);

  // 1. 최근 30일 일별 매출 추이
  const { data: dailySales, error: dailySalesError } = await supabase
    .from('daily_summary')
    .select('sale_date, total_sales')
    .gte('sale_date', thirtyDaysAgoStr)
    .lte('sale_date', todayStr)
    .order('sale_date', { ascending: true });

  if (dailySalesError) {
    console.error('Error fetching daily sales for chart:', dailySalesError);
    throw new Error('일별 매출 데이터를 가져오는 데 실패했습니다.');
  }

  // 2. 카테고리별 매출 비중 (제거됨 - 데이터 구조 변경)
  // const { data: categorySales, error: categorySalesError } = await supabase...
  
  // 빈 배열 반환 (UI 호환성 유지)
  const pieChartData: { name: string; value: number }[] = [];

  return {
    lineChartData: dailySales.map(d => ({ date: d.sale_date, sales: d.total_sales })),
    pieChartData,
  };
}

// 베스트 메뉴 TOP 5를 가져오는 함수
export async function getBestSellers(date: Date = new Date()) {
  const startOfDay = `${getToday(date)}T00:00:00+09:00`;
  const endOfDay = `${getToday(date)}T23:59:59+09:00`;

  const { data, error } = await supabase
    .from('sales_items')
    .select('item_name, quantity')
    .gte('created_at', startOfDay)
    .lte('created_at', endOfDay);

  if (error) {
    console.error('Error fetching best sellers:', error);
    return [];
  }

  const itemTotals = data.reduce((acc, record) => {
    acc[record.item_name] = (acc[record.item_name] || 0) + record.quantity;
    return acc;
  }, {} as { [key: string]: number });

  const sortedItems = Object.entries(itemTotals)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);

  return sortedItems.map(([name, quantity]) => ({ name, quantity }));
}

// 누적 데이터 조회 함수들 (sales_orders 기준)
export async function getAllSalesRecords(startDate?: string, endDate?: string) {
  let query = supabase
    .from('sales_orders')
    .select('id, order_number, channel, order_at, gross_amount, net_amount, is_refund') // 필요한 컬럼만 선택
    .order('order_at', { ascending: false });

  if (startDate) {
    const startUTC = new Date(`${startDate}T00:00:00+09:00`).toISOString();
    query = query.gte('order_at', startUTC);
  }
  if (endDate) {
    const endUTC = new Date(`${endDate}T23:59:59+09:00`).toISOString();
    query = query.lte('order_at', endUTC);
  }

  if (!startDate && !endDate) {
    query = query.limit(100); // 기본 로딩 한도 축소
  }

  const { data, error } = await query;
  if (error) {
    console.error('Error fetching all sales records:', error);
    return [];
  }

  return data;
}

export async function getAllDailySummaries(startDate?: string, endDate?: string) {
  let query = supabase
    .from('daily_summary')
    .select('*')
    .order('sale_date', { ascending: false });

  if (startDate) {
    query = query.gte('sale_date', startDate);
  }
  if (endDate) {
    query = query.lte('sale_date', endDate);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching daily summaries:', error);
    throw new Error('일별 요약 데이터를 가져오는 데 실패했습니다.');
  }

  return data;
}

export async function getCategorySummary() {
  // 카테고리 데이터 없음
  return [];
}

export async function getItemSummary(startDate?: string, endDate?: string) {
  let query = supabase
    .from('sales_items')
    .select('item_name, total_amount, quantity, sale_date');

  if (startDate) {
    query = query.gte('sale_date', startDate);
  }
  if (endDate) {
    query = query.lte('sale_date', endDate);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching item summary:', error);
    return [];
  }

  const itemMap = data.reduce((acc, record) => {
    if (!acc[record.item_name]) {
      acc[record.item_name] = { totalSales: 0, totalQuantity: 0 };
    }
    acc[record.item_name].totalSales += record.total_amount;
    acc[record.item_name].totalQuantity += record.quantity;
    return acc;
  }, {} as { [key: string]: { totalSales: number; totalQuantity: number } });

  return Object.entries(itemMap)
    .map(([itemName, data]) => ({
      itemName,
      totalSales: data.totalSales,
      totalQuantity: data.totalQuantity,
    }))
    .sort((a, b) => b.totalSales - a.totalSales);
}

// 주별 및 월별 증감률 계산
export async function getTrendData(date: Date = new Date()) {
  const today = date;
  
  // 이번 주
  const thisWeekStart = format(startOfWeek(today, { weekStartsOn: 1 }), 'yyyy-MM-dd');
  const thisWeekEnd = format(endOfWeek(today, { weekStartsOn: 1 }), 'yyyy-MM-dd');
  
  // 저번 주
  const lastWeekStart = format(startOfWeek(subWeeks(today, 1), { weekStartsOn: 1 }), 'yyyy-MM-dd');
  const lastWeekEnd = format(endOfWeek(subWeeks(today, 1), { weekStartsOn: 1 }), 'yyyy-MM-dd');
  
  // 이번 달
  const thisMonthStart = format(startOfMonth(today), 'yyyy-MM-dd');
  const thisMonthEnd = getToday();
  
  // 저번 달
  const lastMonth = subDays(startOfMonth(today), 1);
  const lastMonthStart = format(startOfMonth(lastMonth), 'yyyy-MM-dd');
  const lastMonthEnd = format(lastMonth, 'yyyy-MM-dd');

  // 이번 주 매출
  const { data: thisWeekData } = await supabase
    .from('daily_summary')
    .select('total_sales')
    .gte('sale_date', thisWeekStart)
    .lte('sale_date', thisWeekEnd);
  const thisWeekSales = thisWeekData?.reduce((sum, d) => sum + d.total_sales, 0) || 0;

  // 저번 주 매출
  const { data: lastWeekData } = await supabase
    .from('daily_summary')
    .select('total_sales')
    .gte('sale_date', lastWeekStart)
    .lte('sale_date', lastWeekEnd);
  const lastWeekSales = lastWeekData?.reduce((sum, d) => sum + d.total_sales, 0) || 0;

  // 이번 달 매출
  const { data: thisMonthData } = await supabase
    .from('daily_summary')
    .select('total_sales')
    .gte('sale_date', thisMonthStart)
    .lte('sale_date', thisMonthEnd);
  const thisMonthSales = thisMonthData?.reduce((sum, d) => sum + d.total_sales, 0) || 0;

  // 저번 달 매출
  const { data: lastMonthData } = await supabase
    .from('daily_summary')
    .select('total_sales')
    .gte('sale_date', lastMonthStart)
    .lte('sale_date', lastMonthEnd);
  const lastMonthSales = lastMonthData?.reduce((sum, d) => sum + d.total_sales, 0) || 0;

  // 증감률 계산
  const weeklyChange = lastWeekSales === 0
    ? (thisWeekSales > 0 ? 100 : 0)
    : ((thisWeekSales - lastWeekSales) / lastWeekSales) * 100;

  const monthlyChange = lastMonthSales === 0
    ? (thisMonthSales > 0 ? 100 : 0)
    : ((thisMonthSales - lastMonthSales) / lastMonthSales) * 100;

  return {
    thisWeekSales,
    lastWeekSales,
    weeklyChange: weeklyChange.toFixed(1),
    thisMonthSales,
    lastMonthSales,
    monthlyChange: monthlyChange.toFixed(1),
  };
}

// 오늘 시간대별 매출 데이터
export async function getHourlySalesData(date: Date = new Date()) {
  const todayStr = getToday(date);
  // UTC 기준으로 변환하여 조회 (KST 00:00:00은 UTC 이전 날 15:00:00)
  const startKST = new Date(`${todayStr}T00:00:00+09:00`);
  const endKST = new Date(`${todayStr}T23:59:59+09:00`);

  const { data, error } = await supabase
    .from('sales_orders')
    .select('order_at, net_amount')
    .gte('order_at', startKST.toISOString())
    .lte('order_at', endKST.toISOString());

  if (error) {
    console.error('Error fetching hourly sales data:', error);
    return Array.from({ length: 24 }, (_, i) => ({ hour: `${i}시`, sales: 0 }));
  }

  const hourlySales = Array.from({ length: 24 }, (_, i) => ({ hour: `${i}시`, sales: 0 }));

  data.forEach(order => {
    // order_at이 UTC이므로 KST로 변환하여 시간 추출
    const kstDate = new Date(order.order_at);
    const hour = kstDate.getHours();
    if (hour >= 0 && hour < 24) {
      hourlySales[hour].sales += order.net_amount;
    }
  });

  return hourlySales;
}

/**
 * 특정 날짜의 상품별 매출 비중 파이차트 데이터를 가져옵니다.
 */
export async function getItemPieChartData(date: Date = new Date()) {
  const startOfDay = `${getToday(date)}T00:00:00+09:00`;
  const endOfDay = `${getToday(date)}T23:59:59+09:00`;

  const { data, error } = await supabase
    .from('sales_items')
    .select('item_name, total_amount')
    .gte('created_at', startOfDay)
    .lte('created_at', endOfDay);

  if (error) {
    console.error('Error fetching item pie chart data:', error);
    return [];
  }

  const itemTotals = data.reduce((acc, record) => {
    acc[record.item_name] = (acc[record.item_name] || 0) + record.total_amount;
    return acc;
  }, {} as { [key: string]: number });

  const sortedItems = Object.entries(itemTotals).sort(([, a], [, b]) => b - a);
  return sortedItems.slice(0, 10).map(([name, value]) => ({ name, value }));
}
