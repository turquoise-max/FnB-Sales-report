import { supabase } from './supabaseClient';
import { startOfMonth, subDays, format, startOfWeek, endOfWeek, subWeeks } from 'date-fns';

// 오늘 날짜를 'YYYY-MM-DD' 형식으로 가져오는 헬퍼 함수
const getToday = () => format(new Date(), 'yyyy-MM-dd');

// KPI 카드 데이터를 가져오는 함수
export async function getKpiData() {
  const todayStr = getToday();
  const yesterdayStr = format(subDays(new Date(), 1), 'yyyy-MM-dd');
  const startOfMonthStr = format(startOfMonth(new Date()), 'yyyy-MM-dd');

  // 1. 오늘 총 매출
  const { data: todayData, error: todayError } = await supabase
    .from('daily_summary')
    .select('total_sales')
    .eq('sale_date', todayStr)
    .single();

  if (todayError && todayError.code !== 'PGRST116') {
    console.error('Error fetching today\'s sales:', todayError);
    throw new Error('오늘 매출을 가져오는 데 실패했습니다.');
  }
  const todaySales = todayData?.total_sales || 0;

  // 2. 어제 총 매출
  const { data: yesterdayData, error: yesterdayError } = await supabase
    .from('daily_summary')
    .select('total_sales')
    .eq('sale_date', yesterdayStr)
    .single();
    
  if (yesterdayError && yesterdayError.code !== 'PGRST116') {
    console.error('Error fetching yesterday\'s sales:', yesterdayError);
    throw new Error('어제 매출을 가져오는 데 실패했습니다.');
  }
  const yesterdaySales = yesterdayData?.total_sales || 0;

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

// 차트 데이터를 가져오는 함수
export async function getChartData() {
  const today = new Date();
  const thirtyDaysAgoStr = format(subDays(today, 30), 'yyyy-MM-dd');
  const todayStr = getToday();

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
export async function getBestSellers() {
  const thirtyDaysAgoStr = format(subDays(new Date(), 30), 'yyyy-MM-dd');
  const todayStr = getToday();

  const { data, error } = await supabase
    .from('sales_records')
    .select('item_name, quantity')
    .gte('sale_date', thirtyDaysAgoStr)
    .lte('sale_date', todayStr);

  if (error) {
    console.error('Error fetching best sellers:', error);
    throw new Error('베스트 메뉴 데이터를 가져오는 데 실패했습니다.');
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

// 누적 데이터 조회 함수들
export async function getAllSalesRecords(startDate?: string, endDate?: string) {
  let query = supabase
    .from('sales_records')
    .select('*')
    .order('sale_date', { ascending: false })
    .order('payment_time', { ascending: false });

  if (startDate) {
    query = query.gte('sale_date', startDate);
  }
  if (endDate) {
    query = query.lte('sale_date', endDate);
  }

  // 기본적으로 최근 1000개만 가져오도록 제한 (성능 최적화)
  // 날짜 필터가 없을 때 전체 데이터를 가져오는 것은 위험함
  if (!startDate && !endDate) {
    query = query.limit(1000);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching all sales records:', error);
    throw new Error('전체 매출 레코드를 가져오는 데 실패했습니다.');
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
    .from('sales_records')
    .select('item_name, net_amount, quantity');

  if (startDate) {
    query = query.gte('sale_date', startDate);
  }
  if (endDate) {
    query = query.lte('sale_date', endDate);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching item summary:', error);
    throw new Error('상품별 데이터를 가져오는 데 실패했습니다.');
  }

  const itemMap = data.reduce((acc, record) => {
    if (!acc[record.item_name]) {
      acc[record.item_name] = { totalSales: 0, totalQuantity: 0 };
    }
    acc[record.item_name].totalSales += record.net_amount;
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
export async function getTrendData() {
  const today = new Date();
  
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
export async function getHourlySalesData() {
  const todayStr = getToday();

  const { data, error } = await supabase
    .from('sales_records')
    .select('payment_time, net_amount')
    .eq('sale_date', todayStr)
    .not('payment_time', 'is', null);

  if (error) {
    console.error('Error fetching hourly sales data:', error);
    // 에러 발생 시 빈 데이터 반환 (차트 렌더링 중단 방지)
    return Array.from({ length: 24 }, (_, i) => ({
      hour: `${i}시`,
      sales: 0
    }));
  }

  // 0시 ~ 23시 초기화
  const hourlySales = Array.from({ length: 24 }, (_, i) => ({
    hour: `${i}시`,
    sales: 0
  }));

  data.forEach(record => {
    if (record.payment_time) {
      // payment_time 형식: 'HH:MM:SS'
      const hour = parseInt(record.payment_time.split(':')[0], 10);
      if (hour >= 0 && hour < 24) {
        hourlySales[hour].sales += record.net_amount;
      }
    }
  });

  return hourlySales;
}

// 상품별 파이차트 데이터 (상위 10개만 표시, 기타 제외)
export async function getItemPieChartData() {
  const thirtyDaysAgoStr = format(subDays(new Date(), 30), 'yyyy-MM-dd');
  const todayStr = getToday();

  const { data, error } = await supabase
    .from('sales_records')
    .select('item_name, net_amount')
    .gte('sale_date', thirtyDaysAgoStr)
    .lte('sale_date', todayStr);

  if (error) {
    console.error('Error fetching item pie chart data:', error);
    throw new Error('상품별 데이터를 가져오는 데 실패했습니다.');
  }

  const itemTotals = data.reduce((acc, record) => {
    acc[record.item_name] = (acc[record.item_name] || 0) + record.net_amount;
    return acc;
  }, {} as { [key: string]: number });

  const sortedItems = Object.entries(itemTotals)
    .sort(([, a], [, b]) => b - a);

  // 상위 10개만 추출 (기타 항목 제외)
  const top10 = sortedItems.slice(0, 10);

  const pieData = top10.map(([name, value]) => ({ name, value }));

  return pieData;
}
