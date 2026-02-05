/**
 * 배달의 민족 데이터 수집기 (Crawler)
 * Browserless.io를 통해 원격 브라우저를 제어하여 배민 사장님광장의 매출 데이터를 자동 수집합니다.
 */
import { chromium } from 'playwright-core';
import { supabase } from '../database/supabaseClient';

interface BaeminCrawlResult {
    success?: string;
    error?: string;
    affectedDates?: string[];
}

export async function runBaeminCrawler(startDate: string, endDate: string): Promise<BaeminCrawlResult> {
    const isProduction = process.env.NODE_ENV === 'production' || process.env.VERCEL === '1';
    const BROWSERLESS_API_KEY = process.env.BROWSERLESS_API_KEY;

    let browser;
    if (isProduction) {
        if (!BROWSERLESS_API_KEY) {
            console.error("[Baemin] BROWSERLESS_API_KEY가 설정되지 않았습니다.");
            return { error: "서버 설정 오류: Browserless API 키가 누락되었습니다. Vercel 환경 변수를 확인해주세요." };
        }
        console.log(`[Baemin] Browserless 연결 시도...`);
        try {
            browser = await chromium.connectOverCDP(
                `wss://chrome.browserless.io?token=${BROWSERLESS_API_KEY}&--window-size=1280,1000&stealth`
            );
        } catch (connError: any) {
            console.error("[Baemin] Browserless 연결 실패:", connError);
            return { error: `브라우저 서버 연결 실패: ${connError.message}` };
        }
    } else {
        console.log(`[Baemin] 로컬 브라우저 실행...`);
        browser = await chromium.launch({
            headless: isProduction, // 로컬 개발 시에는 브라우저 노출
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
    }

    try {
        const context = await browser.newContext({ 
            viewport: { width: 1920, height: 1080 },
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
            locale: 'ko-KR',
            timezoneId: 'Asia/Seoul',
            extraHTTPHeaders: {
                'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
            },
            isMobile: false,
            hasTouch: false
        });
        const page = await context.newPage();

        // 봇 탐지 우회를 위한 핑거프린트 위조 스크립트 주입
        await page.addInitScript(() => {
            // navigator.webdriver 속성 제거
            Object.defineProperty(navigator, 'webdriver', { get: () => false });
            // 크롬 관련 속성 주입
            (window as any).chrome = { runtime: {} };
            // 플러그인 개수 속여 일반 브라우저처럼 보이기
            Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
            // 언어 설정 강제
            Object.defineProperty(navigator, 'languages', { get: () => ['ko-KR', 'ko'] });
        });

        // 1. 배민 로그인
        console.log(`[Baemin] 1. 로그인 페이지 접속 중...`);
        try {
            // Referer를 주입하여 정상적인 접근으로 위장
            await page.setExtraHTTPHeaders({
                'Referer': 'https://www.google.com/'
            });
            await page.goto("https://biz-member.baemin.com/login", { waitUntil: 'load', timeout: 40000 });
            await page.waitForTimeout(5000); // 렌더링 시간 충분히 확보
            
            // 다중 셀렉터 전략: name 외에도 흔히 쓰이는 속성 시도
            const idInput = page.locator("input[name='id'], input#id, input[type='text']").first();
            
            // 대기 실패 시 스크린샷 캡처
            await idInput.waitFor({ state: 'visible', timeout: 20000 }).catch(async (e) => {
                const screenshot = await page.screenshot({ type: 'jpeg', quality: 60 });
                const base64 = screenshot.toString('base64');
                const title = await page.title();
                console.error(`[Baemin] 로그인 페이지 요소 탐색 실패. URL: ${page.url()}, Title: ${title}`);
                throw new Error(`로그인 필드 탐색 실패. 현재 페이지 제목: ${title}. (스크린샷 포함): DATA:IMAGE/JPEG;BASE64,${base64}`);
            });
        
        console.log(`[Baemin] 1-2. 로그인 정보 입력 중...`);
        await idInput.fill("bsmfnb");
        await page.fill("input[name='password']", "mufin00!!");
        
        // 로그인 버튼 클릭 및 리다이렉트 대기
        await Promise.all([
            page.click("button:has-text('로그인')"),
            // URL 변화를 더 여유있게 대기
            page.waitForURL(/baemin\.com/, { waitUntil: 'networkidle', timeout: 30000 })
        ]);
        await page.waitForTimeout(2000); // 세션 처리 대기

        // --- 데이터 가로채기 설정 ---
        let allInterceptedContents: any[] = [];
        
        // API 응답 리스너 등록
        page.on("response", async (res) => {
            if (res.url().includes("v4/orders") && res.status() === 200) {
                try {
                    const data = await res.json();
                    if (data && data.contents && data.contents.length > 0) {
                        console.log(`[Baemin] API 데이터 수신: ${data.contents.length}건 (URL: ${res.url().split('?')[0]})`);
                        allInterceptedContents.push(...data.contents);
                    }
                } catch (e) {}
            }
        });

        // 2. 주문 내역 페이지 이동
        console.log(`[Baemin] 2. 주문 내역 페이지 이동...`);
        await page.goto("https://self.baemin.com/orders/history", { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.waitForTimeout(3000); // 팝업 대기

        // 팝업 제거 (오늘 하루 보지 않기 등)
        try {
            const popupCloseBtn = page.locator('span').filter({ hasText: "오늘 하루 보지 않기" }).first();
            if (await popupCloseBtn.isVisible()) {
                console.log(`[Baemin] 팝업 제거 시도...`);
                await popupCloseBtn.click({ force: true });
                await page.waitForTimeout(1000);
            }
            
            // 일반적인 닫기 버튼(X)도 시도
            const genericCloseBtn = page.locator('button[class*="close"], [class*="CloseButton"]').first();
            if (await genericCloseBtn.isVisible()) {
                await genericCloseBtn.click({ force: true });
                await page.waitForTimeout(500);
            }
        } catch (e: any) {
            console.log(`[Baemin] 팝업 제거 건너뜀: ${e.message}`);
        }
        
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

        // 6. 캘린더에서 날짜 선택 (시작일, 종료일 순차 클릭)
        const selectDateOnCalendar = async (targetDateStr: string) => {
            const [year, month, day] = targetDateStr.split('-').map(Number);
            const targetHeader = `${year}년 ${month}월`;
            
            // 월 이동 로직
            let moveCount = 0;
            while (moveCount < 24) {
                // 현재 화면에 보이는 모든 캘린더 캡션 확인
                const captions = await page.locator('caption[data-atelier-component="Typography"]').allInnerTexts();
                const isMatch = captions.some(c => c.replace(/\s+/g, '').includes(targetHeader.replace(/\s+/g, '')));
                
                if (isMatch) {
                    console.log(`[Baemin] 목표 월(${targetHeader}) 발견`);
                    break;
                }

                // 이동 방향 결정 (첫 번째 캡션 기준)
                const currentMonthYear = captions[0] || "";
                const dateMatches = currentMonthYear.match(/\d+/g);
                if (dateMatches && dateMatches.length >= 2) {
                    const currYear = Number(dateMatches[0]);
                    const currMonth = Number(dateMatches[1]);
                    
                    const isFuture = (year > currYear) || (year === currYear && month > currMonth);
                    const navBtn = isFuture 
                        ? page.locator('button[aria-label="다음 달"]').first()
                        : page.locator('button[aria-label="이전 달"]').first();

                    if (await navBtn.isVisible()) {
                        await navBtn.click({ force: true });
                        await page.waitForTimeout(1000);
                    } else {
                        break;
                    }
                } else {
                    // 캡션을 못 읽을 경우 기본적으로 이전 달 시도
                    await page.locator('button[aria-label="이전 달"]').first().click({ force: true });
                    await page.waitForTimeout(1000);
                }
                moveCount++;
            }

            // 일자 클릭: 제공된 HTML 구조(table role="grid" 내 caption)에 맞춘 정밀 타겟팅
            console.log(`[Baemin] ${targetHeader} 내의 ${day}일 클릭 시도`);
            
            // 1. 해당 연/월 캡션을 포함하는 정확한 <table> 요소를 찾음
            const targetTable = page.locator('table[role="grid"]').filter({ 
                has: page.locator('caption').filter({ hasText: targetHeader }) 
            });

            // 2. 해당 테이블 내부에서만 "N일" aria-label을 가진 버튼 탐색
            const dayBtn = targetTable.locator('button').filter({ 
                hasText: new RegExp(`^${day}$`) 
            }).first();

            if (await dayBtn.count() > 0) {
                console.log(`[Baemin] 정밀 매칭 성공: ${targetHeader} 영역의 ${day}일 클릭`);
                await dayBtn.click({ force: true });
            } else {
                console.log(`[Baemin] 정밀 매칭 실패, aria-label 직접 매칭 시도`);
                // 3. 폴백: 해당 테이블 내 aria-label="${day}일" 직접 탐색
                const ariaLabelBtn = targetTable.locator(`button[aria-label="${day}일"]`).first();
                await ariaLabelBtn.click({ force: true });
            }
            await page.waitForTimeout(1000);
        };

        console.log(`[Baemin] 6-1. 시작일(${startDate}) 선택`);
        await selectDateOnCalendar(startDate);
        console.log(`[Baemin] 6-2. 종료일(${endDate}) 선택`);
        await selectDateOnCalendar(endDate);

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

        // 8. 다중 페이지 탐색 및 데이터 수집
        console.log(`[Baemin] 8. 데이터 수집 및 페이지 탐색 시작...`);
        
        // 첫 페이지 로딩 대기
        await page.waitForTimeout(5000);

        let hasNextPage = true;
        let pageCount = 1;

        while (hasNextPage && pageCount < 20) { // 최대 20페이지까지만 탐색 (안전장치)
            const nextBtn = page.locator('button[aria-label="다음으로"]').first();
            
            // 버튼 존재 여부 및 활성화 상태 체크
            if (await nextBtn.isVisible()) {
                const isDisabled = await nextBtn.getAttribute('data-disabled');
                if (isDisabled === 'false') {
                    console.log(`[Baemin] ${pageCount}페이지 수집 완료. 다음 페이지(${pageCount + 1})로 이동...`);
                    await nextBtn.click({ force: true });
                    await page.waitForTimeout(4000); // 다음 페이지 데이터 로딩 대기
                    pageCount++;
                } else {
                    console.log(`[Baemin] 마지막 페이지 도달.`);
                    hasNextPage = false;
                }
            } else {
                console.log(`[Baemin] 다음 페이지 버튼 없음.`);
                hasNextPage = false;
            }
        }
        
        if (allInterceptedContents.length === 0) {
            await page.screenshot({ path: `baemin-no-data-${Date.now()}.png` });
            return { error: `선택한 기간(${startDate} ~ ${endDate})에 해당하는 배민 주문 데이터를 수신하지 못했습니다.` };
        }

        // 데이터 변환 및 DB 저장
        const ordersWithItems: any[] = [];
        const seenOrderNumbers = new Set();
        const affectedDates = new Set<string>();

        for (const item of allInterceptedContents) {
            const order = item.order;
            const settle = item.settle;

            const orderDateTime = order.orderDateTime; 
            const orderDate = orderDateTime.split('T')[0];

            // 기간 내 필터링
            if (orderDate < startDate || orderDate > endDate) continue;
            if (seenOrderNumbers.has(order.orderNumber)) continue;
            seenOrderNumbers.add(order.orderNumber);

            const depositDueAmount = settle.depositDueAmount || 0;
            
            // 배민 API 구조 확인: settle.orderPriceTotal 외에도 order.totalPrice 확인
            // 보통 사장님광장 API에서는 settle 객체 내의 금액 정보가 정산에 더 정확함
            const customerPayAmount = order.payAmount || 0; 

            // 1. 주문 정보
            // 배민 API의 orderDateTime이 "2025-12-08T16:41:44" 형식이므로 KST 명시
            const orderAtKST = `${orderDateTime}+09:00`;

            const orderData = {
                order_number: order.orderNumber,
                channel: 'BAEMIN',
                order_at: orderAtKST,
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
                    options_text: optionsText || null,
                    sale_date: orderDate,
                    order_at: orderAtKST
                };
            });

            ordersWithItems.push({ order: orderData, items: itemsData });
            affectedDates.add(orderDate);
        }

        if (ordersWithItems.length === 0) {
            return { error: `기간(${startDate} ~ ${endDate}) 내의 주문 내역을 찾을 수 없습니다.` };
        }

        console.log(`[Baemin] ${ordersWithItems.length}건 주문 DB 저장 중...`);

        // 기존 데이터 삭제 (기간 단위)
        const rangeStartUTC = new Date(`${startDate}T00:00:00+09:00`).toISOString();
        const rangeEndUTC = new Date(`${endDate}T23:59:59+09:00`).toISOString();
        await supabase.from('sales_orders').delete().eq('channel', 'BAEMIN').gte('order_at', rangeStartUTC).lte('order_at', rangeEndUTC);

        // 신규 데이터 삽입
        for (const entry of ordersWithItems) {
            const { data: orderData, error: orderError } = await supabase.from('sales_orders').insert(entry.order).select().single();
            if (!orderError && orderData) {
                const itemsToInsert = entry.items.map((item: any) => ({ ...item, order_id: orderData.id }));
                await supabase.from('sales_items').insert(itemsToInsert);
            }
        }

        return { 
            success: `${startDate} ~ ${endDate} 배민 데이터 ${ordersWithItems.length}건 수집 완료!`,
            affectedDates: Array.from(affectedDates) 
        };

        } catch (loginError: any) {
            console.error('[Baemin] Login Step Error:', loginError);
            throw loginError;
        }
    } catch (error: any) {
        console.error('[Baemin] Crawler Error:', error);
        // 이미 스크린샷 정보가 포함된 에러는 그대로 반환
        return { error: `배민 수집 실패: ${error.message}` };
    } finally {
        if (browser) await browser.close();
    }
}