'use server';

import { supabase } from '@/lib/supabaseClient';
import * as XLSX from 'xlsx';

/**
 * 데이터베이스에 삽입될 POS 매출 레코드의 타입 정의
 * @property sale_date - 매출 발생 일자 (YYYY-MM-DD 형식)
 * @property category - 대분류 카테고리 (예: 커피, 브런치, 피자/파스타)
 * @property item_name - 상품명
 * @property quantity - 판매 수량
 * @property total_amount - 총 매출액 (할인 전)
 * @property discount_amount - 총 할인액
 * @property net_amount - 실 매출액 (할인 후)
 * @property source - 데이터 출처 (POS 시스템)
 */
interface SalesRecord {
  sale_date: string;
  category?: string; // 대분류 정보 없음 (Optional)
  item_name: string;
  quantity: number;
  total_amount: number;
  discount_amount: number;
  net_amount: number;
  source: 'POS';
  // [NEW] 추가된 컬럼
  receipt_number?: string;
  pos_number?: string;
  payment_time?: string;
  is_refund?: boolean;
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
  const recordsToInsert: SalesRecord[] = [];
  let posTotal = 0;
  let skippedCount = 0; // 제외된 데이터 개수 추적

  // 금액 파싱 헬퍼 함수: 쉼표 제거 및 숫자 변환
  const parseAmount = (value: any): number => {
    return parseInt(String(value).replace(/,/g, ''), 10) || 0;
  };

  // 헤더 다음 행부터 데이터 파싱 시작
  for (let i = headerRowIndex + 1; i < jsonData.length; i++) {
      const row = jsonData[i];
      if (!row || row.length === 0) continue;

      const itemName = row[headerMap['상품명']];
      // const category = row[headerMap['대분류']]; // [삭제] 대분류 없음
      const quantity = parseInt(row[headerMap['수량']], 10);
      
      const posNumber = row[headerMap['포스번호']];
      const receiptNumber = row[headerMap['영수증번호']];
      const transactionType = row[headerMap['구분']]; // 매출, 반품
      const paymentTime = row[headerMap['결제시각']];

      const netAmount = parseAmount(row[headerMap['실매출액']]);
      const totalAmount = parseAmount(row[headerMap['총매출액']]);
      const discountAmount = parseAmount(row[headerMap['총할인액']]);
      
      // 반품 여부 확인
      const isRefund = transactionType === '반품';

      // ===== 데이터 제외 규칙 =====
      
      // 1. 소계/합계 행 제외
      if (typeof itemName === 'string' && (itemName.includes('소계 :') || itemName.includes('합계'))) {
        continue;
      }

      // 2. 수량이 없는 행 제외 (카테고리 체크 삭제)
      if (isNaN(quantity)) {
        continue;
      }

      // 3. 상품명 검증
      if (!itemName || (typeof itemName === 'string' && itemName.trim() === '')) {
        skippedCount++;
        continue;
      }
      
      // [운영 데이터 필터링] 
      // 기존에는 카테고리 '진동벨'로 걸렀으나, 이제 카테고리가 없으므로 상품명 등으로 판단해야 함.
      // 데이터 예시를 보면 "★★커피벨-11", "★★브런치벨-60" 등의 패턴이 있음.
      const itemNameStr = String(itemName);
      if (itemNameStr.includes('커피벨') || itemNameStr.includes('브런치벨')) {
         skippedCount++;
         continue;
      }

      // [옵션/부가 항목 처리]
      const optionKeywords = ['연하게', '핫', '아이스', '샷추가', '시럽', '휘핑', '얼음', '물양', '선택'];
      const hasOptionKeyword = optionKeywords.some(keyword => itemNameStr.includes(keyword));
      
      // 조건: 옵션 키워드가 포함되어 있고 AND 실매출액이 0원인 경우에만 제외
      if (hasOptionKeyword && netAmount === 0) {
        skippedCount++;
        continue;
      }

      // ===== 유효한 데이터 처리 =====
      
      recordsToInsert.push({
        sale_date: saleDate,
        category: '', // 카테고리 정보 없음 (빈 문자열 처리)
        item_name: itemNameStr.trim(),
        quantity,
        total_amount: totalAmount,
        discount_amount: discountAmount,
        net_amount: netAmount,
        source: 'POS',
        // [NEW] 추가 정보 매핑
        pos_number: posNumber ? String(posNumber) : undefined,
        receipt_number: receiptNumber ? String(receiptNumber) : undefined,
        payment_time: paymentTime ? String(paymentTime) : undefined,
        is_refund: isRefund,
      });
      
      posTotal += netAmount;
    }

  if (recordsToInsert.length === 0) {
    return { error: '처리할 데이터가 없습니다.' };
  }
  
  // 4. Supabase에 데이터 저장
  try {
    // [수정] 해당 날짜의 기존 POS 데이터 삭제 (중복 방지)
    const { error: deleteError } = await supabase
      .from('sales_records')
      .delete()
      .eq('sale_date', saleDate)
      .eq('source', 'POS');
    
    if (deleteError) {
      console.error('기존 데이터 삭제 실패:', deleteError);
      throw new Error('기존 데이터를 삭제하는 중 오류가 발생했습니다.');
    }

    // sales_records에 상세 내역 저장
    const { error: recordsError } = await supabase.from('sales_records').insert(recordsToInsert);
    if (recordsError) throw recordsError;

    // [수정] daily_summary 업데이트 로직 개선
    // 기존 값을 가져와서 더하는 대신, 현재 시점의 sales_records를 다시 집계하여 정확성 보장
    
    // 1. 해당 날짜의 모든 sales_records 조회 (POS + MANUAL)
    const { data: allRecords, error: fetchRecordsError } = await supabase
      .from('sales_records')
      .select('source, net_amount')
      .eq('sale_date', saleDate);

    if (fetchRecordsError) throw fetchRecordsError;

    // 2. 집계 계산
    const newPosTotal = allRecords
      .filter(r => r.source === 'POS')
      .reduce((sum, r) => sum + r.net_amount, 0);
      
    const newManualTotal = allRecords
      .filter(r => r.source === 'MANUAL')
      .reduce((sum, r) => sum + r.net_amount, 0);

    const newTotalSales = newPosTotal + newManualTotal;

    // 3. daily_summary 저장 (UPSERT)
    const { error: upsertError } = await supabase
      .from('daily_summary')
      .upsert({
        sale_date: saleDate,
        pos_sales: newPosTotal,
        manual_sales: newManualTotal,
        total_sales: newTotalSales
      }, { onConflict: 'sale_date' });

    if (upsertError) throw upsertError;
    
    const message = `${recordsToInsert.length}개의 데이터를 성공적으로 업로드했습니다.${skippedCount > 0 ? ` (${skippedCount}개 항목 제외: 진동벨/옵션 등)` : ''}`;
    return { success: message };
  } catch (error: any) {
    console.error('Supabase error:', error);
    return { error: `데이터베이스 저장 중 오류가 발생했습니다: ${error.message}` };
  }
}

// 영업 외 매출 수기 입력 데이터를 처리하는 함수
export async function addManualInput(formData: FormData) {
  const saleDate = formData.get('date') as string;
  const description = formData.get('description') as string;
  const amountStr = formData.get('amount') as string;
  const amount = parseInt(amountStr, 10);

  if (!saleDate || !description || isNaN(amount)) {
    return { error: '유효하지 않은 데이터입니다.' };
  }

  try {
    // 1. manual_inputs 테이블에 저장
    const { error: manualInputError } = await supabase
      .from('manual_inputs')
      .insert({ sale_date: saleDate, description, amount });
    if (manualInputError) throw manualInputError;

    // 2. sales_records 테이블에 'MANUAL' 소스로 저장
    const { error: salesRecordError } = await supabase
      .from('sales_records')
      .insert({
        sale_date: saleDate,
        category: '영업 외 매출',
        item_name: description,
        quantity: 1,
        total_amount: amount,
        discount_amount: 0,
        net_amount: amount,
        source: 'MANUAL',
      });
    if (salesRecordError) throw salesRecordError;

    // 3. daily_summary 업데이트 (UPSERT)
    const { data: existingSummary, error: fetchError } = await supabase
      .from('daily_summary')
      .select('*')
      .eq('sale_date', saleDate)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      throw fetchError;
    }

    if (existingSummary) {
      const { error: updateError } = await supabase
        .from('daily_summary')
        .update({
          manual_sales: (existingSummary.manual_sales || 0) + amount,
          total_sales: (existingSummary.total_sales || 0) + amount,
        })
        .eq('sale_date', saleDate);
      if (updateError) throw updateError;
    } else {
      const { error: insertError } = await supabase
        .from('daily_summary')
        .insert({
          sale_date: saleDate,
          manual_sales: amount,
          total_sales: amount,
          pos_sales: 0,
        });
      if (insertError) throw insertError;
    }

    return { success: '성공적으로 저장되었습니다.' };
  } catch (error: any) {
    console.error('Manual input error:', error);
    return { error: `데이터베이스 저장 중 오류가 발생했습니다: ${error.message}` };
  }
}

// 영업 외 매출 여러 건을 한 번에 처리하는 함수
export async function addMultipleManualInputs(formData: FormData) {
  const saleDate = formData.get('date') as string;
  const rowsStr = formData.get('rows') as string;

  if (!saleDate || !rowsStr) {
    return { error: '유효하지 않은 데이터입니다.' };
  }

  try {
    const rows = JSON.parse(rowsStr);
    let totalAmount = 0;

    // 1. manual_inputs 테이블에 일괄 저장
    const manualInputsData = rows.map((row: any) => ({
      sale_date: saleDate,
      description: row.description,
      amount: parseInt(row.amount, 10),
    }));

    const { error: manualInputError } = await supabase
      .from('manual_inputs')
      .insert(manualInputsData);
    if (manualInputError) throw manualInputError;

    // 2. sales_records 테이블에 일괄 저장
    const salesRecordsData = rows.map((row: any) => {
      const amount = parseInt(row.amount, 10);
      totalAmount += amount;
      return {
        sale_date: saleDate,
        category: '영업 외 매출',
        item_name: row.description,
        quantity: 1,
        total_amount: amount,
        discount_amount: 0,
        net_amount: amount,
        source: 'MANUAL',
      };
    });

    const { error: salesRecordError } = await supabase
      .from('sales_records')
      .insert(salesRecordsData);
    if (salesRecordError) throw salesRecordError;

    // 3. daily_summary 업데이트 (UPSERT)
    const { data: existingSummary, error: fetchError } = await supabase
      .from('daily_summary')
      .select('*')
      .eq('sale_date', saleDate)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      throw fetchError;
    }

    if (existingSummary) {
      const { error: updateError } = await supabase
        .from('daily_summary')
        .update({
          manual_sales: (existingSummary.manual_sales || 0) + totalAmount,
          total_sales: (existingSummary.total_sales || 0) + totalAmount,
        })
        .eq('sale_date', saleDate);
      if (updateError) throw updateError;
    } else {
      const { error: insertError } = await supabase
        .from('daily_summary')
        .insert({
          sale_date: saleDate,
          manual_sales: totalAmount,
          total_sales: totalAmount,
          pos_sales: 0,
        });
      if (insertError) throw insertError;
    }

    return { success: `${rows.length}개의 항목이 성공적으로 저장되었습니다.` };
  } catch (error: any) {
    console.error('Multiple manual input error:', error);
    return { error: `데이터베이스 저장 중 오류가 발생했습니다: ${error.message}` };
  }
}
