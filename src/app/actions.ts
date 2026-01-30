'use server';

import { supabase } from '@/lib/supabaseClient';
import * as XLSX from 'xlsx';
import { runBaeminCrawler } from '@/lib/baemin-crawler';

interface SalesOrder {
  order_number: string;
  channel: 'POS' | 'BAEMIN' | 'COUPANG' | 'MANUAL';
  order_at: string;
  gross_amount: number;
  net_amount: number;
  is_refund?: boolean;
  raw_data?: any;
}

interface SalesItem {
  order_id?: string;
  item_name: string;
  quantity: number;
  unit_price: number;
  total_amount: number;
  options_text?: string;
}

/**
 * POS 엑셀 데이터를 파싱하고 Supabase DB에 업로드하는 함수
 * 
 * @param formData - 업로드된 파일과 날짜 정보를 포함한 FormData
 * @returns 성공 또는 에러 메시지 객체
 * 
 * 처리 과정:
 * 1. 엑셀 파일 읽기 및 JSON 변환
 * 2. 조회일자 자동 추출 또는 사용자 입력 날짜 사용
 * 3. 헤더 행 찾기 및 컬럼 매핑
 * 4. 데이터 행 파싱 및 검증
 * 5. 불필요한 데이터 필터링 (진동벨, 옵션 항목 등)
 * 6. sales_records 및 daily_summary 테이블 업데이트
 */
/**
 * 특정 날짜의 모든 매출 데이터를 재집계하여 daily_summary 테이블을 업데이트합니다.
 * (sales_orders 테이블 기반으로 실매출/총매출 모두 집계)
 */
export async function updateDailySummary(saleDate: string) {
  const startOfDay = `${saleDate}T00:00:00+09:00`;
  const endOfDay = `${saleDate}T23:59:59+09:00`;

  const { data: allOrders, error: fetchOrdersError } = await supabase
    .from('sales_orders')
    .select('channel, net_amount, gross_amount')
    .gte('order_at', startOfDay)
    .lte('order_at', endOfDay);

  if (fetchOrdersError) throw fetchOrdersError;

  // 채널별 집계 (메모리 내 연산이므로 루프를 한 번만 돌아 최적화)
  const stats = {
    POS: { net: 0, gross: 0 },
    BAEMIN: { net: 0, gross: 0 },
    COUPANG: { net: 0, gross: 0 },
    MANUAL: { net: 0, gross: 0 }
  };

  allOrders?.forEach(o => {
    const channel = o.channel as keyof typeof stats;
    if (stats[channel]) {
      stats[channel].net += (o.net_amount || 0);
      stats[channel].gross += (o.gross_amount || 0);
    }
  });

  const totalSales = Object.values(stats).reduce((sum, s) => sum + s.net, 0);
  const totalGross = Object.values(stats).reduce((sum, s) => sum + s.gross, 0);

  // 3. daily_summary 저장
  const { error: upsertError } = await supabase
    .from('daily_summary')
    .upsert({
      sale_date: saleDate,
      total_sales: totalSales,
      total_gross: totalGross,
      pos_sales: stats.POS.net,
      pos_gross: stats.POS.gross,
      manual_sales: stats.MANUAL.net,
      manual_gross: stats.MANUAL.gross,
      baemin_sales: stats.BAEMIN.net,
      baemin_gross: stats.BAEMIN.gross,
      coupang_sales: stats.COUPANG.net,
      coupang_gross: stats.COUPANG.gross
    }, { onConflict: 'sale_date' });

  if (upsertError) throw upsertError;
}

/**
 * 배달의 민족 데이터를 크롤링하고 DB에 저장합니다.
 */
export async function crawlBaeminData(saleDate: string) {
  try {
    const result = await runBaeminCrawler(saleDate);
    if (result.error) return result;

    // 수집 성공 후 요약 데이터 갱신
    await updateDailySummary(saleDate);

    return result;
  } catch (error: any) {
    console.error('Crawl action error:', error);
    return { error: `배민 데이터 처리 중 오류: ${error.message}` };
  }
}

export async function uploadExcelData(formData: FormData) {
  const file = formData.get('file') as File;
  let saleDate = formData.get('saleDate') as string;

  if (!file) {
    return { error: '파일이 없습니다.' };
  }

  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

  // 1. 날짜 추출
  if (!saleDate) {
    const dateRow = jsonData.find(row => typeof row[0] === 'string' && row[0].includes('조회일자'));
    if (dateRow) {
      const dateMatch = dateRow[0].match(/(\d{4}-\d{2}-\d{2})/);
      if (dateMatch) {
        saleDate = dateMatch[1];
      }
    }
  }

  if (!saleDate) {
    return { error: '매출 일자를 확인할 수 없습니다. 날짜를 직접 선택해주세요.' };
  }

  // 2. 헤더 매핑 (유연한 검색)
  // 각 행의 셀 값을 문자열로 변환하고 앞뒤 공백을 제거한 후 비교합니다.
  let headerRowIndex = -1;
  let header: any[] = [];

  for (let i = 0; i < jsonData.length; i++) {
    const row = jsonData[i];
    // 배열이 아니거나 비어있으면 건너뜀
    if (!Array.isArray(row) || row.length === 0) continue;

    // 각 셀을 문자열로 변환하고 공백 제거
    const normalizedRow = row.map(cell => String(cell).trim());
    
    // 필수 컬럼인 '영수증번호'와 '상품명'이 포함되어 있는지 확인
    if (normalizedRow.includes('영수증번호') && normalizedRow.includes('상품명')) {
      headerRowIndex = i;
      header = row; // 원본 행 유지 (값 추출 시 사용)
      break;
    }
  }

  if (headerRowIndex === -1) {
    console.error('헤더를 찾을 수 없습니다. 읽은 데이터(상위 5행):', jsonData.slice(0, 5));
    return { error: '올바른 엑셀 형식이 아닙니다. \'영수증번호\'와 \'상품명\' 컬럼을 찾을 수 없습니다.' };
  }

  // 헤더 인덱스 매핑 (trim 적용)
  const normalizedHeader = header.map(cell => String(cell).trim());
  
  // 할인액 컬럼명 처리 (총할인액 vs 할인액)
  const discountColIndex = normalizedHeader.indexOf('총할인액') !== -1 
    ? normalizedHeader.indexOf('총할인액') 
    : normalizedHeader.indexOf('할인액');

  const headerMap: { [key: string]: number } = {
    '포스번호': normalizedHeader.indexOf('포스번호'),
    '영수증번호': normalizedHeader.indexOf('영수증번호'),
    '구분': normalizedHeader.indexOf('구분'), // 매출/반품 구분
    '결제시각': normalizedHeader.indexOf('결제시각'),
    '상품명': normalizedHeader.indexOf('상품명'),
    '수량': normalizedHeader.indexOf('수량'),
    '총매출액': normalizedHeader.indexOf('총매출액'),
    '총할인액': discountColIndex,
    '실매출액': normalizedHeader.indexOf('실매출액'),
  };
  
  // 필수 컬럼 인덱스 확인
  if (headerMap['상품명'] === -1) {
    return { error: '필수 컬럼(상품명)의 위치를 확인할 수 없습니다.' };
  }

  console.log('헤더 매핑 성공:', headerMap);

  // 3. 데이터 파싱 및 정제
  const ordersMap = new Map<string, { order: SalesOrder; items: SalesItem[] }>();
  let skippedCount = 0;

  const parseAmount = (value: any): number => parseInt(String(value).replace(/,/g, ''), 10) || 0;

  for (let i = headerRowIndex + 1; i < jsonData.length; i++) {
    const row = jsonData[i];
    if (!row || row.length === 0) continue;

    const itemName = String(row[headerMap['상품명']] || '').trim();
    const quantity = parseInt(row[headerMap['수량']], 10);
    const receiptNumber = String(row[headerMap['영수증번호']] || '').trim();
    const paymentTime = String(row[headerMap['결제시각']] || '').trim();
    const transactionType = row[headerMap['구분']];
    const netAmount = parseAmount(row[headerMap['실매출액']]);
    const totalAmount = parseAmount(row[headerMap['총매출액']]);
    
    // 유효성 검사: 영수증 번호가 없거나, 상품명이 합계/소계인 경우 제외
    if (!receiptNumber || receiptNumber === 'undefined' || receiptNumber === '') continue;
    if (itemName.includes('소계') || itemName.includes('합계') || isNaN(quantity)) continue;
    if (itemName.includes('커피벨') || itemName.includes('브런치벨')) { skippedCount++; continue; }

    // 주문번호 생성: 영수증번호_날짜_결제시각 조합
    const key = `${receiptNumber}_${saleDate}_${paymentTime}`;
    if (!ordersMap.has(key)) {
      ordersMap.set(key, {
        order: {
          order_number: key,
          channel: 'POS',
          order_at: `${saleDate}T${paymentTime}+09:00`,
          gross_amount: 0,
          net_amount: 0,
          is_refund: transactionType === '반품'
        },
        items: []
      });
    }

    const entry = ordersMap.get(key)!;
    entry.order.gross_amount += totalAmount;
    entry.order.net_amount += netAmount;
    entry.items.push({
      item_name: itemName.trim(),
      quantity,
      unit_price: Math.round(totalAmount / quantity),
      total_amount: totalAmount
    });
  }

  // 4. Supabase 저장 (Bulk Insert로 최적화)
  try {
    const startOfDay = `${saleDate}T00:00:00+09:00`;
    const endOfDay = `${saleDate}T23:59:59+09:00`;
    
    // 기존 데이터 삭제
    await supabase.from('sales_orders').delete().eq('channel', 'POS').gte('order_at', startOfDay).lte('order_at', endOfDay);

    // 1단계: 주문 데이터 벌크 삽입
    const orderEntries = Array.from(ordersMap.values());
    const { data: insertedOrders, error: ordersError } = await supabase
      .from('sales_orders')
      .insert(orderEntries.map(d => d.order))
      .select();

    if (ordersError) throw ordersError;

    // 2단계: 삽입된 ID를 매핑하여 아이템 데이터 벌크 삽입
    const allItemsToInsert: any[] = [];
    insertedOrders.forEach(order => {
      // order_number로 원래의 items 데이터를 찾음
      const originalEntry = orderEntries.find(e => e.order.order_number === order.order_number);
      if (originalEntry) {
        originalEntry.items.forEach(item => {
          allItemsToInsert.push({ ...item, order_id: order.id });
        });
      }
    });

    if (allItemsToInsert.length > 0) {
      const { error: itemsError } = await supabase.from('sales_items').insert(allItemsToInsert);
      if (itemsError) throw itemsError;
    }

    // 일별 요약 갱신
    await updateDailySummary(saleDate);
    
    const message = `${ordersMap.size}건의 주문 데이터를 성공적으로 업로드했습니다.${skippedCount > 0 ? ` (${skippedCount}개 항목 제외: 진동벨/옵션 등)` : ''}`;
    return { success: message };
  } catch (error: any) {
    console.error('Supabase error:', error);
    return { error: `데이터베이스 저장 중 오류가 발생했습니다: ${error.message}` };
  }
}

/**
 * 엑셀의 날짜/시간 데이터를 문자열로 정제하는 헬퍼 함수
 */
function formatExcelDateTime(dateVal: any, timeVal: any): { date: string; time: string } {
  let dateStr = "";
  let timeStr = "00:00:00";

  // 1. 날짜 처리
  if (typeof dateVal === 'number') {
    // 엑셀 시리얼 번호인 경우 (XLSX.read 시 cellDates 옵션 없이 읽었을 때)
    const date = XLSX.SSF.parse_date_code(dateVal);
    dateStr = `${date.y}-${String(date.m).padStart(2, '0')}-${String(date.d).padStart(2, '0')}`;
  } else {
    dateStr = String(dateVal).trim().split(' ')[0]; // "2025-12-01 00:00" 등 대응
  }

  // 2. 시간 처리
  if (typeof timeVal === 'number') {
    const time = XLSX.SSF.parse_date_code(timeVal);
    timeStr = `${String(time.H).padStart(2, '0')}:${String(time.M).padStart(2, '0')}:${String(time.S).padStart(2, '0')}`;
  } else {
    const rawTime = String(timeVal).trim();
    if (rawTime.includes(':')) {
      const parts = rawTime.split(':');
      timeStr = `${parts[0].padStart(2, '0')}:${(parts[1] || '00').padStart(2, '0')}:${(parts[2] || '00').padStart(2, '0')}`;
    }
  }

  return { date: dateStr, time: timeStr };
}

/**
 * 쿠팡이츠 엑셀 데이터를 파싱하고 Supabase DB에 업로드하는 함수 (UPSERT 방식)
 */
export async function uploadCoupangExcel(formData: FormData) {
  const file = formData.get('file') as File;
  if (!file) return { error: '파일이 없습니다.' };

  try {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const jsonData: any[] = XLSX.utils.sheet_to_json(sheet, { header: 1 });

    let headerRowIndex = -1;
    for (let i = 0; i < jsonData.length; i++) {
      if (jsonData[i] && Array.isArray(jsonData[i]) && jsonData[i].includes('주문번호')) {
        headerRowIndex = i;
        break;
      }
    }

    if (headerRowIndex === -1) return { error: '올바른 쿠팡이츠 정산 내역 파일이 아닙니다.' };

    const header = jsonData[headerRowIndex].map((h: any) => String(h).trim());
    const dataRows = jsonData.slice(headerRowIndex + 1);

    const colMap = {
      date: header.indexOf('일자'),
      time: header.indexOf('시간'),
      orderNo: header.indexOf('주문번호'),
      menu: header.indexOf('상세내역'),
      payAmount: header.indexOf('결제금액'),
      settleAmount: header.lastIndexOf('산정후'),
      refundAmount: header.indexOf('환급액')
    };

    const ordersMap = new Map<string, { order: SalesOrder; items: SalesItem[] }>();
    const saleDates = new Set<string>();

    dataRows.forEach(row => {
      const orderNo = String(row[colMap.orderNo]).trim();
      if (!orderNo || orderNo === 'undefined' || orderNo === 'null' || orderNo === '주문번호') return;

      const { date, time } = formatExcelDateTime(row[colMap.date], row[colMap.time]);
      const menuStr = String(row[colMap.menu] || '');
      const grossAmount = parseInt(String(row[colMap.payAmount]).replace(/,/g, '')) || 0;
      const settleAmount = parseInt(String(row[colMap.settleAmount]).replace(/,/g, '')) || 0;
      const refundAmount = parseInt(String(row[colMap.refundAmount]).replace(/,/g, '')) || 0;
      const netAmount = settleAmount + refundAmount;

      if (!date || date === 'undefined') return;
      saleDates.add(date);

      if (!ordersMap.has(orderNo)) {
        ordersMap.set(orderNo, {
          order: {
            order_number: orderNo,
            channel: 'COUPANG',
            order_at: `${date}T${time}+09:00`,
            gross_amount: grossAmount,
            net_amount: netAmount,
            raw_data: row
          },
          items: menuStr.split(',').map(m => ({ 
            item_name: m.trim(), 
            quantity: 1, 
            unit_price: 0, 
            total_amount: 0 
          }))
        });
      }
    });

    // 1. sales_orders UPSERT
    const ordersToUpsert = Array.from(ordersMap.values()).map(d => d.order);
    const { data: upsertedOrders, error: upsertError } = await supabase
      .from('sales_orders')
      .upsert(ordersToUpsert, { onConflict: 'order_number,channel' })
      .select();

    if (upsertError) throw upsertError;

    // 2. sales_items 갱신 (기존 아이템 삭제 후 재삽입)
    const upsertedIds = upsertedOrders.map(o => o.id);
    await supabase.from('sales_items').delete().in('order_id', upsertedIds);

    const allItemsToInsert: SalesItem[] = [];
    upsertedOrders.forEach(order => {
      const originalData = ordersMap.get(order.order_number);
      if (originalData) {
        originalData.items.forEach(item => {
          allItemsToInsert.push({ ...item, order_id: order.id });
        });
      }
    });

    if (allItemsToInsert.length > 0) {
      const { error: itemsError } = await supabase.from('sales_items').insert(allItemsToInsert);
      if (itemsError) throw itemsError;
    }

    // 3. 일별 요약 갱신
    for (const date of saleDates) await updateDailySummary(date);

    return { success: `${ordersMap.size}건의 쿠팡이츠 데이터를 UPSERT 방식으로 업데이트했습니다.` };

  } catch (error: any) {
    console.error('Coupang upload error:', error);
    return { error: `쿠팡이츠 처리 중 오류: ${error.message}` };
  }
}

// 영업 외 매출 여러 건을 한 번에 처리하는 함수
export async function addMultipleManualInputs(formData: FormData) {
  const saleDate = formData.get('date') as string;
  const rowsStr = formData.get('rows') as string;

  if (!saleDate || !rowsStr) return { error: '유효하지 않은 데이터입니다.' };

  try {
    const rows = JSON.parse(rowsStr);
    const orderNumber = `MANUAL_${saleDate}_${Date.now()}`;
    
    // 합계 계산
    const totalGross = rows.reduce((sum: number, r: any) => sum + (parseInt(r.grossAmount, 10) || 0), 0);
    const totalNet = rows.reduce((sum: number, r: any) => sum + (parseInt(r.netAmount, 10) || 0), 0);

    // 1. sales_orders 저장
    const { data: orderData, error: orderError } = await supabase
      .from('sales_orders')
      .insert({
        order_number: orderNumber,
        channel: 'MANUAL',
        order_at: `${saleDate}T12:00:00+09:00`,
        gross_amount: totalGross,
        net_amount: totalNet
      }).select().single();

    if (orderError) throw orderError;

    // 2. sales_items 저장
    const itemsToInsert = rows.map((row: any) => {
        const itemGross = parseInt(row.grossAmount, 10) || 0;
        return {
            order_id: orderData.id,
            item_name: row.description,
            quantity: 1,
            unit_price: itemGross,
            total_amount: itemGross
        };
    });

    await supabase.from('sales_items').insert(itemsToInsert);
    await updateDailySummary(saleDate);

    return { success: `${rows.length}개의 항목이 성공적으로 저장되었습니다.` };
  } catch (error: any) {
    console.error('Manual input error:', error);
    return { error: `데이터베이스 저장 중 오류가 발생했습니다: ${error.message}` };
  }
}
