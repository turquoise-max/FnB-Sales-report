/**
 * F&B Dashboard 서버 액션
 * 클라이언트 컴포넌트에서 호출할 수 있는 서버 측 비즈니스 로직을 정의합니다.
 */
'use server';

import { supabase } from '@/lib/database/supabaseClient';
import * as XLSX from 'xlsx';
import { runBaeminCrawler } from '@/lib/services/baemin-crawler';

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
  sale_date: string;
  order_at: string;
  item_name: string;
  quantity: number;
  unit_price: number;
  total_amount: number;
  options_text?: string;
}

/**
 * 특정 날짜의 모든 매출 데이터를 재집계하여 daily_summary 테이블을 업데이트합니다.
 * sales_orders 테이블의 데이터를 기반으로 채널별 실매출 및 총매출을 합산합니다.
 * @param saleDate - 집계할 날짜 (YYYY-MM-DD)
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
 * 배달의 민족 데이터를 자동 수집(크롤링)하고 DB에 저장합니다.
 * 수집 완료 후 해당 기간의 날짜별 요약 데이터들을 모두 갱신합니다.
 * @param startDate - 시작일 (YYYY-MM-DD)
 * @param endDate - 종료일 (YYYY-MM-DD)
 */
export async function crawlBaeminData(startDate: string, endDate: string) {
  try {
    const result = await runBaeminCrawler(startDate, endDate);
    if (result.error) return result;
    
    // 영향을 받은 모든 날짜에 대해 요약 갱신
    if (result.affectedDates) {
      for (const date of result.affectedDates) {
        await updateDailySummary(date);
      }
    }
    
    return result;
  } catch (error: any) {
    console.error('Crawl action error:', error);
    return { error: `배민 데이터 처리 중 오류: ${error.message}` };
  }
}

/**
 * 단일 POS 엑셀 파일을 파싱하고 DB에 업로드합니다.
 * 엑셀 내 '조회일자'를 자동으로 찾아 해당 날짜의 매출로 기록합니다.
 * @param formData - 업로드된 파일 데이터를 포함한 객체
 */
export async function uploadSingleExcelFile(formData: FormData) {
  const file = formData.get('file') as File;
  if (!file) return { error: '파일이 없습니다.' };

  try {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

    let saleDate = "";
    const dateRow = jsonData.find(row => typeof row[0] === 'string' && row[0].includes('조회일자'));
    if (dateRow) {
      const dateMatch = dateRow[0].match(/(\d{4}-\d{2}-\d{2})/);
      if (dateMatch) saleDate = dateMatch[1];
    }
    
    if (!saleDate) return { error: `[${file.name}] 매출 일자를 확인할 수 없습니다.` };

    let headerRowIndex = -1;
    let header: any[] = [];
    for (let i = 0; i < jsonData.length; i++) {
      const row = jsonData[i];
      if (!Array.isArray(row)) continue;
      const normalizedRow = row.map(cell => String(cell).trim());
      if (normalizedRow.includes('영수증번호') && normalizedRow.includes('상품명')) {
        headerRowIndex = i;
        header = row;
        break;
      }
    }

    if (headerRowIndex === -1) return { error: `[${file.name}] 헤더를 찾을 수 없습니다.` };
    
    const normalizedHeader = header.map(cell => String(cell).trim());
    const headerMap = {
      '영수증번호': normalizedHeader.indexOf('영수증번호'),
      '구분': normalizedHeader.indexOf('구분'),
      '결제시각': normalizedHeader.indexOf('결제시각'),
      '상품명': normalizedHeader.indexOf('상품명'),
      '수량': normalizedHeader.indexOf('수량'),
      '총매출액': normalizedHeader.indexOf('총매출액'),
      '실매출액': normalizedHeader.indexOf('실매출액'),
    };

    const ordersMap = new Map<string, { order: SalesOrder; items: SalesItem[] }>();
    let skippedCount = 0;

    for (let i = headerRowIndex + 1; i < jsonData.length; i++) {
      const row = jsonData[i];
      if (!row || row.length === 0) continue;

      const itemName = String(row[headerMap['상품명']] || '').trim();
      const quantity = parseInt(row[headerMap['수량']], 10);
      const receiptNumber = String(row[headerMap['영수증번호']] || '').trim();
      const paymentTime = String(row[headerMap['결제시각']] || '').trim();
      const transactionType = row[headerMap['구분']];
      const netAmount = parseInt(String(row[headerMap['실매출액']]).replace(/,/g, ''), 10) || 0;
      const totalAmount = parseInt(String(row[headerMap['총매출액']]).replace(/,/g, ''), 10) || 0;

      if (!receiptNumber || itemName.includes('소계') || itemName.includes('합계') || isNaN(quantity)) continue;
      if (itemName.includes('벨')) { skippedCount++; continue; }

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
        item_name: itemName,
        quantity,
        unit_price: Math.round(totalAmount / quantity),
        total_amount: totalAmount,
        sale_date: saleDate,
        order_at: `${saleDate}T${paymentTime}+09:00`
      });
    }

    const orderEntries = Array.from(ordersMap.values());
    if (orderEntries.length > 0) {
      const startOfDay = `${saleDate}T00:00:00+09:00`;
      const endOfDay = `${saleDate}T23:59:59+09:00`;
      await supabase.from('sales_orders').delete().eq('channel', 'POS').gte('order_at', startOfDay).lte('order_at', endOfDay);

      const { data: insertedOrders, error: ordersError } = await supabase.from('sales_orders').insert(orderEntries.map(d => d.order)).select();
      if (ordersError) throw ordersError;

      const allItemsToInsert: any[] = [];
      insertedOrders.forEach(order => {
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
      await updateDailySummary(saleDate);
    }

    return { 
      success: true, 
      date: saleDate, 
      count: orderEntries.length, 
      skipped: skippedCount 
    };
  } catch (error: any) {
    console.error('Single upload error:', error);
    return { error: `[${file.name}] 처리 실패: ${error.message}` };
  }
}

function formatExcelDateTime(dateVal: any, timeVal: any): { date: string; time: string } {
  let dateStr = "";
  let timeStr = "00:00:00";
  if (typeof dateVal === 'number') {
    const date = XLSX.SSF.parse_date_code(dateVal);
    dateStr = `${date.y}-${String(date.m).padStart(2, '0')}-${String(date.d).padStart(2, '0')}`;
  } else {
    dateStr = String(dateVal).trim().split(' ')[0];
  }
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
 * 단일 쿠팡이츠 엑셀 파일을 파싱하고 DB에 업로드합니다.
 */
export async function uploadSingleCoupangFile(formData: FormData) {
  const file = formData.get('file') as File;
  if (!file) return { error: '파일 없음' };
  try {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const jsonData: any[] = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { header: 1 });
    let headerRowIndex = jsonData.findIndex(row => Array.isArray(row) && row.includes('주문번호'));
    if (headerRowIndex === -1) return { error: `[${file.name}] 잘못된 형식` };
    
    // 1행(Category)과 2행(Field) 추출
    const categoryRow = jsonData[headerRowIndex - 1] || [];
    const fieldRow = jsonData[headerRowIndex].map((h: any) => String(h).trim());
    const dataRows = jsonData.slice(headerRowIndex + 1);

    // '정산금액' 섹션 범위 내의 '산정후' 컬럼 인덱스 찾기
    let settleAmountIdx = -1;
    const settleCategoryIdx = categoryRow.findIndex((c: any) => String(c).includes('정산금액'));
    if (settleCategoryIdx !== -1) {
      // '정산금액' 섹션 시작부터 다음 섹션 전까지 탐색
      for (let j = settleCategoryIdx; j < fieldRow.length; j++) {
        if (fieldRow[j] === '산정후') {
          settleAmountIdx = j;
          break;
        }
      }
    }
    // 예외 케이스: 정산금액 섹션을 못 찾으면 기존처럼 lastIndexOf 시도
    if (settleAmountIdx === -1) settleAmountIdx = fieldRow.lastIndexOf('산정후');

    const colMap = { 
      date: fieldRow.indexOf('일자'), 
      time: fieldRow.indexOf('시간'), 
      orderNo: fieldRow.indexOf('주문번호'), 
      menu: fieldRow.indexOf('상세내역'), 
      payAmount: fieldRow.indexOf('결제금액'), 
      settleAmount: settleAmountIdx, 
      refundAmount: fieldRow.indexOf('환급액') 
    };

    const ordersMap = new Map<string, { order: SalesOrder; items: SalesItem[] }>();
    const saleDates = new Set<string>();

    dataRows.forEach(row => {
      const orderNo = String(row[colMap.orderNo]).trim();
      if (!orderNo || orderNo === '주문번호' || orderNo === 'undefined') return;
      
      const { date, time } = formatExcelDateTime(row[colMap.date], row[colMap.time]);
      const parseAmt = (v: any) => {
        if (typeof v === 'number') return v;
        return parseInt(String(v || '0').replace(/,/g, ''), 10) || 0;
      };
      
      // 수정된 공식: 총매출 = 결제금액, 실매출 = 산정후 + 환급액
      const grossAmount = parseAmt(row[colMap.payAmount]);
      const settleAmount = parseAmt(row[colMap.settleAmount]);
      const refundAmount = parseAmt(row[colMap.refundAmount]);
      const netAmount = settleAmount + refundAmount;

      if (!date || date === 'undefined') return;
      
      saleDates.add(date);
      
      // 시간 포맷 보정 (KST 명시)
      const formattedTime = time.split(':').map(part => part.padStart(2, '0')).join(':');
      const orderAtKST = `${date}T${formattedTime}+09:00`;

      // 상세내역 문자열에서 개별 상품 및 수량 추출 함수
      const parseMenuItems = (menuStr: string, isRefundOrder: boolean) => {
        return menuStr.split(',').map(m => {
          const trimmed = m.trim();
          // "상품명x2" 또는 "상품명 x2" 패턴 매칭
          const match = trimmed.match(/(.+?)\s*x\s*(\d+)$/);
          let name = trimmed;
          let qty = isRefundOrder ? -1 : 1;

          if (match) {
            name = match[1].trim();
            qty = isRefundOrder ? -parseInt(match[2], 10) : parseInt(match[2], 10);
          }
          
          return {
            item_name: name,
            quantity: qty,
            unit_price: 0,
            total_amount: 0, // 개별 가격 정보 없음
            sale_date: date,
            order_at: orderAtKST
          };
        }).filter(item => item.item_name !== '');
      };

      const isRefund = netAmount < 0 || grossAmount < 0;

      if (ordersMap.has(orderNo)) {
        const e = ordersMap.get(orderNo)!;
        e.order.gross_amount += grossAmount; 
        e.order.net_amount += netAmount; 
        e.order.is_refund = e.order.net_amount <= 0;
        
        e.items.push(...parseMenuItems(String(row[colMap.menu] || ''), isRefund));
      } else {
        ordersMap.set(orderNo, { 
          order: { 
            order_number: orderNo, 
            channel: 'COUPANG', 
            order_at: orderAtKST, 
            gross_amount: grossAmount, 
            net_amount: netAmount, 
            is_refund: isRefund, 
            raw_data: row 
          }, 
          items: parseMenuItems(String(row[colMap.menu] || ''), isRefund)
        });
      }
    });

    if (ordersMap.size > 0) {
    const ordersToUpsert = Array.from(ordersMap.values()).map(d => d.order);
    const { data: upsertedOrders, error: upsertError } = await supabase
      .from('sales_orders')
      .upsert(ordersToUpsert, { onConflict: 'order_number,channel' })
      .select();
      
    if (upsertError) throw upsertError;
      
      await supabase.from('sales_items').delete().in('order_id', upsertedOrders.map(o => o.id));
      const allItems: any[] = [];
      upsertedOrders.forEach(o => {
        const d = ordersMap.get(o.order_number);
        if (d) d.items.forEach(i => allItems.push({ ...i, order_id: o.id }));
      });
      
      if (allItems.length > 0) await supabase.from('sales_items').insert(allItems);
      for (const date of saleDates) await updateDailySummary(date);
    }
    
    return { success: true, count: ordersMap.size };
  } catch (error: any) {
    console.error('Coupang single upload error:', error);
    return { error: `[${file.name}] ${error.message}` };
  }
}

export async function addMultipleManualInputs(formData: FormData) {
  const saleDate = formData.get('date') as string;
  const rows = JSON.parse(formData.get('rows') as string);
  try {
    const orderNumber = `MANUAL_${saleDate}_${Date.now()}`;
    const totalGross = rows.reduce((sum: number, r: any) => sum + (parseInt(r.grossAmount, 10) || 0), 0);
    const totalNet = rows.reduce((sum: number, r: any) => sum + (parseInt(r.netAmount, 10) || 0), 0);
    const { data: orderData, error: orderError } = await supabase.from('sales_orders').insert({ order_number: orderNumber, channel: 'MANUAL', order_at: `${saleDate}T12:00:00+09:00`, gross_amount: totalGross, net_amount: totalNet }).select().single();
    if (orderError) throw orderError;
    const orderAtKST = `${saleDate}T12:00:00+09:00`;
    const items = rows.map((row: any) => ({ 
      order_id: orderData.id, 
      item_name: row.description, 
      quantity: 1, 
      unit_price: parseInt(row.grossAmount, 10) || 0, 
      total_amount: parseInt(row.grossAmount, 10) || 0, 
      sale_date: saleDate, 
      order_at: orderAtKST 
    }));
    await supabase.from('sales_items').insert(items);
    await updateDailySummary(saleDate);
    return { success: '저장 완료' };
  } catch (error: any) {
    return { error: error.message };
  }
}

export async function saveKpiTarget(month: string, target: number) {
  try {
    const targetMonth = `${month}-01`;
    const { error } = await supabase.from('kpi_targets').upsert({ target_month: targetMonth, sales_target: target }, { onConflict: 'target_month' });
    if (error) throw error;
    return { success: '저장 완료' };
  } catch (error: any) {
    return { error: error.message };
  }
}

export async function getKpiTarget(month: string) {
  try {
    const { data, error } = await supabase.from('kpi_targets').select('sales_target').eq('target_month', `${month}-01`).single();
    if (error && error.code !== 'PGRST116') throw error;
    return data?.sales_target || 0;
  } catch (error: any) {
    return 0;
  }
}