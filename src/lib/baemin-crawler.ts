import { chromium } from 'playwright-core';
import chromium_headless from '@sparticuz/chromium';
import { supabase } from './supabaseClient';

interface BaeminCrawlResult {
    success?: string;
    error?: string;
}

export async function runBaeminCrawler(targetDate: string): Promise<BaeminCrawlResult> {
    const isProduction = process.env.NODE_ENV === 'production' || process.env.VERCEL === '1';
    
    const browser = await chromium.launch({
        args: isProduction ? chromium_headless.args : ['--no-sandbox', '--disable-setuid-sandbox'],
        executablePath: isProduction ? await chromium_headless.executablePath() : undefined,
        headless: isProduction ? true : false,
    });

    try {
        const context = await browser.newContext({ viewport: { width: 1280, height: 1000 } });
        const page = await context.newPage();

        // 1. 배민 로그인
        console.log(`[Baemin] 1. 로그인 중...`);
        await page.goto("https://biz-member.baemin.com/login");
        await page.fill("input[name='id']", "bsmfnb");
        await page.fill("input[name='password']", "mufin00!!");
        
        // 로그인 후 리다이렉트가 완료될 때까지 확실히 대기
        await Promise.all([
            page.click("button:has-text('로그인')"),
            page.waitForURL(/baemin\.com/, { timeout: 20000 })
        ]);
        await page.waitForTimeout(2000); // 세션 처리 대기

        // --- 데이터 가로채기 설정 (리스너 일찍 등록) ---
        let allInterceptedContents: any[] = [];
        const waitForData = new Promise(resolve => {
            page.on("response", async (res) => {
                if (res.url().includes("v4/orders") && res.status() === 200) {
                    try {
                        const data = await res.json();
                        if (data && data.contents && data.contents.length > 0) {
                            console.log(`[Baemin] API 데이터 수신: ${data.contents.length}건 (URL: ${res.url().split('?')[0]})`);
                            allInterceptedContents.push(...data.contents);
                            // 특정 날짜 데이터가 포함되어 있는지 확인
                            const hasTargetDate = data.contents.some((item: any) => 
                                item.order?.orderDateTime?.startsWith(targetDate)
                            );
                            if (hasTargetDate) {
                                console.log(`[Baemin] 목표 날짜(${targetDate}) 데이터 확인됨!`);
                                resolve(true);
                            }
                        }
                    } catch (e) {}
                }
            });
            // 최종 버튼 클릭 후 데이터가 올 시간을 충분히 줌
            setTimeout(() => resolve(allInterceptedContents.length > 0), 35000);
        });

        // 2. 주문 내역 페이지 이동
        console.log(`[Baemin] 2. 주문 내역 페이지 이동...`);
        await page.goto("https://self.baemin.com/orders/history", { waitUntil: 'domcontentloaded', timeout: 30000 });
        
        // 페이지 내 핵심 요소가 보일 때까지 대기 (로딩 보장)
        const dateTrigger = page.locator('button').filter({ hasText: /날짜|기간|조회기간/ }).first();
        await dateTrigger.waitFor({ state: 'visible', timeout: 15000 });
        await page.waitForTimeout(2000);

        // 3. 날짜 직접 선택 클릭
        console.log(`[Baemin] 3. 날짜 직접 선택 클릭...`);
        await dateTrigger.click({ force: true });
        await page.waitForTimeout(1500);

        // 4. 기간 모달에서 날짜 탭 클릭
        console.log(`[Baemin] 4. 날짜 탭 클릭...`);
        const dateTab = page.locator('button, label').filter({ hasText: /^날짜$/ }).first();
        await dateTab.click({ force: true });
        await page.waitForTimeout(500);

        // 5. 캘린더 오픈 (날짜 탭 아래 영역 1회 클릭)
        console.log(`[Baemin] 5. 캘린더 트리거 클릭 (날짜 탭 아래 영역)...`);
        const calendarTrigger = page.locator('div[role="dialog"] [class*="Filter"], div[role="dialog"] [class*="Date"]').locator('text=/\\d{4}\\.|~/').first();
        const dayPickerSelector = '.DayPicker-wrapper, .DayPicker, [class*="DayPicker"]';
        
        await calendarTrigger.click({ force: true });
        try {
            await page.waitForSelector(dayPickerSelector, { state: 'visible', timeout: 8000 });
            console.log(`[Baemin] 캘린더 노출 성공`);
        } catch (e) {}
        await page.waitForTimeout(1500);

        // 6. 캘린더에서 날짜로 이동 및 선택
        const [year, month, day] = targetDate.split('-').map(Number);
        const targetHeader = `${year}년 ${month}월`;
        console.log(`[Baemin] 6. ${targetHeader} ${day}일 이동 중...`);
        
        let moveCount = 0;
        while (moveCount < 24) {
            const captions = await page.locator('caption[data-atelier-component="Typography"]').allInnerTexts();
            const isMatch = captions.some(c => c.replace(/\s+/g, '').includes(targetHeader.replace(/\s+/g, '')));

            if (isMatch) {
                console.log(`[Baemin] 목표 월 발견`);
                break;
            }

            const prevBtn = page.locator('button[aria-label="이전 달"]').first();
            if (await prevBtn.isVisible()) {
                await prevBtn.click({ force: true });
                await page.waitForTimeout(1000);
            } else {
                break;
            }
            moveCount++;
        }

        // 일자 선택
        const dayBtn = page.locator('div').filter({ 
            has: page.locator(`caption:has-text("${year}"), caption:has-text("${month}")`) 
        }).locator('button, [role="button"]').filter({ hasText: new RegExp(`^${day}$`) }).first();
        
        if (await dayBtn.isVisible()) {
            await dayBtn.click({ force: true });
            await page.waitForTimeout(300);
            await dayBtn.click({ force: true });
            console.log(`[Baemin] ${day}일 선택 완료`);
        } else {
            const fallbackDayBtn = page.locator('button, [role="button"]').filter({ hasText: new RegExp(`^${day}$`) }).first();
            await fallbackDayBtn.click({ force: true });
            await page.waitForTimeout(300);
            await fallbackDayBtn.click({ force: true });
        }

        // 7. 적용 버튼 시퀀스 (이미지 분석 기반 2단계 적용)
        console.log(`[Baemin] 7. 적용 버튼 클릭 시퀀스...`);
        
        // 7-1. 캘린더 내부 적용 버튼 (fit-content 스타일)
        console.log(`[Baemin] 7-1. 캘린더 내부 적용 버튼 클릭`);
        const calendarApply = page.locator('button[data-atelier-component="Button"]').filter({ hasText: "적용" })
            .filter({ has: page.locator('xpath=..').locator('[style*="fit-content"]') }).first();
        
        // 만약 스타일 필터가 까다로우면 텍스트 기반으로 보완
        if (await calendarApply.count() > 0) {
            await calendarApply.click({ force: true });
        } else {
            await page.locator('button:has-text("적용")').first().click({ force: true });
        }
        await page.waitForTimeout(1000);

        // 7-2. 기간 모달 최종 적용 버튼 (100% 너비 스타일)
        console.log(`[Baemin] 7-2. 기간 모달 최종 적용 버튼 클릭`);
        const finalApply = page.locator('button[data-atelier-component="Button"]').filter({ hasText: "적용" })
            .filter({ has: page.locator('xpath=..').locator('[style*="100%"]') }).last();
        
        if (await finalApply.count() > 0) {
            await finalApply.click({ force: true });
        } else {
            await page.locator('button:has-text("적용")').last().click({ force: true });
        }

        // 8. API 데이터 수집
        console.log(`[Baemin] 8. 데이터 수신 대기...`);
        await waitForData;
        
        if (allInterceptedContents.length === 0) {
            await page.screenshot({ path: `baemin-no-data-${Date.now()}.png` });
            return { error: `${targetDate}에 해당하는 배민 주문 데이터를 수신하지 못했습니다. (데이터 없음)` };
        }

        // 데이터 변환 및 DB 저장
        const ordersWithItems: any[] = [];
        const seenOrderNumbers = new Set();

        for (const item of allInterceptedContents) {
            const order = item.order;
            const settle = item.settle;

            const orderDateTime = order.orderDateTime; // "2025-12-08T16:41:44"
            const [orderDate, _] = orderDateTime.split('T');

            // 선택한 날짜와 일치하는 데이터만 필터링 (중복 주문번호 방지)
            if (orderDate !== targetDate) continue;
            if (seenOrderNumbers.has(order.orderNumber)) continue;
            seenOrderNumbers.add(order.orderNumber);

            const depositDueAmount = settle.depositDueAmount || 0;
            
            // 배민 API 구조 확인: settle.orderPriceTotal 외에도 order.totalPrice 확인
            // 보통 사장님광장 API에서는 settle 객체 내의 금액 정보가 정산에 더 정확함
            const customerPayAmount = order.payAmount || 0; 

            // 1. 주문 정보
            const orderData = {
                order_number: order.orderNumber,
                channel: 'BAEMIN',
                order_at: `${orderDateTime}+09:00`,
                gross_amount: customerPayAmount,
                net_amount: depositDueAmount,
                is_refund: order.status !== 'CLOSED' && order.status !== 'FINISHED',
                raw_data: item
            };

            // 2. 아이템 정보
            const itemsData = order.items.map((menuItem: any) => {
                const optionsText = menuItem.options
                    ?.map((opt: any) => opt.name)
                    .filter((name: string) => name && name.trim() !== '')
                    .join(', ');

                return {
                    item_name: menuItem.name,
                    quantity: menuItem.quantity,
                    unit_price: Math.round(menuItem.totalPrice / menuItem.quantity),
                    total_amount: menuItem.totalPrice,
                    options_text: optionsText || null
                };
            });

            ordersWithItems.push({ order: orderData, items: itemsData });
        }

        if (ordersWithItems.length === 0) {
            return { error: `${targetDate} 날짜와 일치하는 주문 내역이 응답에 없습니다.` };
        }

        console.log(`[Baemin] ${ordersWithItems.length}건 주문 DB 저장 중...`);

        // 기존 데이터 삭제 (중복 방지)
        const startOfDay = `${targetDate}T00:00:00+09:00`;
        const endOfDay = `${targetDate}T23:59:59+09:00`;
        await supabase.from('sales_orders').delete().eq('channel', 'BAEMIN').gte('order_at', startOfDay).lte('order_at', endOfDay);

        // 신규 데이터 삽입
        for (const entry of ordersWithItems) {
            const { data: orderData, error: orderError } = await supabase.from('sales_orders').insert(entry.order).select().single();
            if (!orderError) {
                const itemsToInsert = entry.items.map((item: any) => ({ ...item, order_id: orderData.id }));
                await supabase.from('sales_items').insert(itemsToInsert);
            }
        }

        // daily_summary 업데이트를 위해 actions.ts의 로직을 재사용해야 하나, 
        // 여기서는 집계 데이터만 반환하거나 직접 업데이트 가능
        // 통합성을 위해 daily_summary 재집계 쿼리 실행 추천

        return { success: `${targetDate} 배민 데이터 ${ordersWithItems.length}건 주문 수집 및 저장 완료!` };

    } catch (error: any) {
        console.error('[Baemin] Crawler Error:', error);
        return { error: `배민 수집 실패: ${error.message}` };
    } finally {
        await browser.close();
    }
}
