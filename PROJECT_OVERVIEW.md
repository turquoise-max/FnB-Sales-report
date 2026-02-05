# 🍽️ F&B 매출 관리 대시보드 (FnB Sales Dashboard)

## 📋 프로젝트 개요

**F&B 매출 관리 대시보드**는 외식업 매장의 매출 데이터를 통합 관리하고 분석하는 웹 기반 대시보드 솔루션입니다. 

POS 시스템, 배달앱(배민), 오픈마켓(쿠팡) 등 다양한 판매 채널의 데이터를 한 곳에서 수집하고, 시간대별·요일별·상품별로 분석하며, 매일 자동으로 Slack 알림을 전송합니다.

---

## 🎯 주요 기능

### 1️⃣ **데이터 입력 & 통합**
- **POS 데이터 업로드**: Excel 파일 자동 파싱 (조회일자 자동 인식)
- **배민(Baemin) 자동 수집**: Playwright를 활용한 사장님광장 데이터 크롤링
- **쿠팡 데이터 업로드**: Excel 형식 지원
- **수기 매출 입력**: 배달앱 외 현금 매출 및 기타 항목 직접 기록

### 2️⃣ **대시보드 & 시각화**
- **KPI 카드**: 
  - 오늘 총 매출 / 전일 대비 증감률
  - 이번 달 누적 매출
  - 채널별 매출 상세 (POS, 배민, 쿠팡, 수기)

- **차트 & 그래프**:
  - 📈 시간대별 매출 추이 (08:00~21:00)
  - 📊 최근 30일 일별 매출 추이
  - 🥧 상품별 매출 비중 (Top 5 파이차트)
  - 📅 요일별 매출 비교

- **상세 리포트**:
  - 일간 매출 리포트 (Daily)
  - 주간 매출 리포트 (Weekly)
  - 월간 매출 리포트 (Monthly)

### 3️⃣ **데이터 조회 & 필터링**
- 날짜 범위 조건 검색
- 채널별 / 상품별 필터링
- 모든 매출 레코드 테이블 뷰

### 4️⃣ **자동화 & 알림**
- ⏰ **Slack 일일 리포트**: 매일 오전 9시 어제 매출 자동 전송 (Vercel Cron)
- 📧 채널별 실매출액 상세 정보 포함

### 5️⃣ **설정 & 관리**
- 🔌 Supabase DB 연결 상태 확인
- 🎨 다크/라이트 테마 토글
- 🎯 월별 KPI 목표 설정
- 🔐 Slack Webhook 연동 테스트

---

## 🏗️ 시스템 아키텍처

### 데이터 흐름

```
┌─────────────────────────────────────────────────────────┐
│          다양한 판매 채널                                   │
├──────────┬──────────┬──────────┬──────────┐             │
│   POS    │    배민   │   쿠팡    │  수기     │             │
└──────────┴──────────┴──────────┴────────────────────────┘ 
           ↓
┌─────────────────────────────────────────────────────────┐
│    FnB 대시보드 (데이터 입력 페이지)                      │
│  • POS Excel 업로드 + 파싱                              │
│  • 배민 자동 크롤링 (Playwright)                        │
│  • 쿠팡 데이터 업로드                                   │
│  • 수기 매출 입력                                       │
└─────────────────────────────────────────────────────────┘
           ↓
┌─────────────────────────────────────────────────────────┐
│    Supabase PostgreSQL Database                          │
│  ├─ sales_orders (주문 통합 테이블)                     │
│  ├─ sales_items (상품 상세 테이블)                      │
│  ├─ daily_summary (일별 요약 테이블)                    │
│  ├─ kpi_targets (목표 테이블)                           │
│  └─ material_costs, sg_and_a_costs (비용 테이블)       │
└─────────────────────────────────────────────────────────┘
           ↓
┌─────────────────────────────────────────────────────────┐
│    대시보드 & 분석 화면                                    │
│  • 실시간 KPI 카드                                      │
│  • 시각화 차트 (Recharts)                              │
│  • 데이터 조회 & 필터링                                │
└─────────────────────────────────────────────────────────┘
           ↓
┌─────────────────────────────────────────────────────────┐
│    자동화 (Vercel Cron)                                  │
│  • 매일 오전 9시 어제 매출 Slack 전송                    │
└─────────────────────────────────────────────────────────┘
```

---

## 💾 데이터베이스 스키마

### 핵심 테이블

#### 1. `sales_orders` - 주문 통합 테이블
```
id (UUID)              → 고유 ID
order_number (VARCHAR) → 주문번호 (채널별 고유)
channel (VARCHAR)      → 판매 채널 (POS, BAEMIN, COUPANG, MANUAL)
order_at (TIMESTAMPTZ) → 주문 일시 (타임존 포함, KST)
gross_amount (INTEGER) → 고객 결제 총액
net_amount (INTEGER)   → 실 매출액 (수수료 제외)
is_refund (BOOLEAN)    → 환불 여부
raw_data (JSONB)       → 원본 데이터 저장
created_at (TIMESTAMPTZ)
```

#### 2. `sales_items` - 상품 상세 테이블
```
id (UUID)              → 고유 ID
order_id (UUID FK)     → 주문 ID (sales_orders 참조)
sale_date (DATE)       → 매출 날짜
order_at (TIMESTAMPTZ) → 주문 일시
item_name (VARCHAR)    → 상품명
quantity (INTEGER)     → 수량
unit_price (INTEGER)   → 단가
total_amount (INTEGER) → 합계 금액
options_text (TEXT)    → 옵션 정보
created_at (TIMESTAMPTZ)
```

#### 3. `daily_summary` - 일별 요약 테이블 (성능 최적화)
```
sale_date (DATE PK)    → 매출 날짜
total_sales (INTEGER)  → 전체 실매출 합계
total_gross (INTEGER)  → 전체 총매출 합계

[채널별]
pos_sales / pos_gross
manual_sales / manual_gross
baemin_sales / baemin_gross
coupang_sales / coupang_gross

created_at (TIMESTAMPTZ)
```

#### 4. `kpi_targets` - KPI 목표 테이블
```
target_month (DATE PK)   → 월 단위 (yyyy-mm-01 형식)
sales_target (INTEGER)   → 목표 매출액
created_at (TIMESTAMPTZ)
```

---

## 🗂️ 프로젝트 구조

```
fnb-dashboard/
├── src/
│   ├── app/                              # Next.js App Router
│   │   ├── page.tsx                      # 홈 페이지 (기능 네비게이션)
│   │   ├── layout.tsx                    # 루트 레이아웃
│   │   ├── globals.css                   # 전역 스타일
│   │   ├── actions.ts                    # Server Actions (데이터 처리)
│   │   ├── api/
│   │   │   ├── check-db/                 # DB 연결 상태 체크 API
│   │   │   ├── cron/
│   │   │   │   └── daily-report/         # 매일 9시 Slack 리포트 (Cron Job)
│   │   │   └── test-slack/               # Slack 알림 테스트 API
│   │   ├── dashboard/
│   │   │   └── page.tsx                  # 대시보드 메인 페이지
│   │   ├── data-input/
│   │   │   └── page.tsx                  # 데이터 입력 페이지
│   │   ├── data-view/
│   │   │   └── page.tsx                  # 누적 데이터 조회 페이지
│   │   └── settings/
│   │       └── page.tsx                  # 설정 페이지
│   │
│   ├── components/
│   │   ├── charts/
│   │   │   ├── LineChart.tsx             # 라인 차트 컴포넌트
│   │   │   ├── PieChart.tsx              # 파이 차트 컴포넌트
│   │   │   └── PieChartWithFilter.tsx    # 필터링 가능한 파이 차트
│   │   ├── common/
│   │   │   ├── Sidebar.tsx               # 네비게이션 사이드바
│   │   │   ├── DatePicker.tsx            # 날짜 선택 컴포넌트
│   │   │   ├── DateRangePicker.tsx       # 날짜 범위 선택
│   │   │   ├── ThemeToggle.tsx           # 다크/라이트 토글
│   │   │   └── theme-provider.tsx        # Theme Provider
│   │   ├── dashboard/
│   │   │   ├── DailyReport.tsx           # 일일 리포트 카드
│   │   │   ├── WeeklyReport.tsx          # 주간 리포트 카드
│   │   │   ├── MonthlyReport.tsx         # 월간 리포트 카드
│   │   │   ├── ReportCard.tsx            # 리포트 카드 래퍼
│   │   │   └── (기타 대시보드 컴포넌트)
│   │   ├── data-input/
│   │   │   ├── PosUploadCard.tsx         # POS 업로드 카드
│   │   │   ├── ManualSalesForm.tsx       # 수기 매출 폼
│   │   │   ├── BaeminCrawlCard.tsx       # 배민 크롤 카드
│   │   │   ├── CoupangUploadCard.tsx     # 쿠팡 업로드 카드
│   │   │   └── KpiTargetForm.tsx         # KPI 목표 설정 폼
│   │   └── ui/                           # shadcn/ui 컴포넌트
│   │       ├── button.tsx
│   │       ├── card.tsx
│   │       ├── input.tsx
│   │       ├── select.tsx
│   │       ├── tabs.tsx
│   │       ├── table.tsx
│   │       └── (기타 UI 컴포넌트)
│   │
│   └── lib/
│       ├── utils.ts                      # 유틸리티 함수
│       ├── database/
│       │   └── supabaseClient.ts         # Supabase 클라이언트 설정
│       └── services/
│           ├── dashboard-data.ts         # 대시보드 데이터 로직
│           ├── reports-data.ts           # 리포트 데이터 로직
│           └── baemin-crawler.ts         # 배민 크롤링 로직
│
├── db/
│   └── init.sql                          # 데이터베이스 스키마
│
├── public/                               # 정적 자산
├── package.json                          # 의존성 관리
├── next.config.ts                        # Next.js 설정
├── tsconfig.json                         # TypeScript 설정
├── tailwind.config.ts                    # Tailwind CSS 설정
├── .env.local                            # 환경변수 (로컬)
└── README.md                             # 프로젝트 가이드
```

---

## 🛠️ 기술 스택

### Frontend
- **Framework**: Next.js 16.1.3 (App Router)
- **Language**: TypeScript 5
- **UI Framework**: React 19.2.3
- **Styling**: Tailwind CSS 4, shadcn/ui
- **Charts**: Recharts 3.6.0
- **Icons**: Lucide React
- **Date Handling**: date-fns 4.1.0
- **File Processing**: xlsx 0.18.5

### Backend & Database
- **Database**: Supabase (PostgreSQL)
- **SDK**: @supabase/supabase-js 2.90.1
- **Scraping**: Playwright Core 1.58.1

### Deployment & Automation
- **Hosting**: Vercel
- **Cron Jobs**: Vercel Cron
- **Notifications**: Slack Webhook API

---

## 📊 주요 페이지 상세 설명

### 1. 홈 페이지 (`/`)
- 프로젝트 소개 및 주요 기능 네비게이션
- 각 섹션으로의 빠른 이동 링크

### 2. 데이터 입력 (`/data-input`)
**목적**: 다양한 채널의 매출 데이터 수집

**기능**:
- **POS 데이터**: 
  - Excel 파일 업로드
  - 자동 날짜 추출
  - 헤더 매핑 (총매출액, 실매출액 등)
  - DB 자동 저장

- **배민 자동 수집**:
  - 사장님광장 로그인 자동화 (Playwright)
  - 일자별 매출 데이터 크롤링
  - API 인터셉트를 통한 정확한 데이터 수집

- **쿠팡 데이터**:
  - 배송료별 정산 현황 Excel 파일 업로드
  - 반품/환불 데이터 자동 처리

- **수기 매출**:
  - 배달앱 외 현금 매출 직접 입력
  - 기타 항목 기록
  - 일자별, 금액별 정리

### 3. 누적 데이터 (`/data-view`)
**목적**: 모든 매출 레코드의 통합 조회

**기능**:
- 📋 테이블 뷰: 전체 매출 레코드 조회
- 🔍 필터링: 날짜 범위, 채널별 선택
- 📊 요약 정보: 채널별 합계, 환불액 포함/제외
- 💾 데이터 다운로드 (예정)

### 4. 대시보드 (`/dashboard`)
**목적**: 실시간 매출 분석 및 경영 현황 파악

**4-1. 일일 리포트 (Daily)**
- KPI 카드
  - 오늘 총 매출액
  - 전일 대비 증감률 (%)
  - 채널별 상세 (POS, 배민, 쿠팡, 수기)

- 시간대별 매출 추이
  - 라인 차트 (08:00 ~ 21:00)
  - 시간당 매출액 시각화
  - 피크 타임 파악

**4-2. 주간 리포트 (Weekly)**
- 이번 주 vs 저번 주 매출 비교
- 요일별 매출 추이 (라인 차트)
- 일평균 매출 계산
- 채널별 매출 현황

**4-3. 월간 리포트 (Monthly)**
- 이번 달 누적 매출
- 목표 대비 달성률 (%)
- 저번 달 대비 증감 추이
- 상품별 매출 비중 (Top 5 파이차트)

### 5. 설정 (`/settings`)
**목적**: 시스템 설정 및 유지보수

**기능**:
- 🔌 **DB 연결 확인**: Supabase 연결 상태 체크
- 🎯 **KPI 목표 설정**: 월별 매출 목표 입력
- 🎨 **테마 설정**: 다크/라이트 모드 토글
- 🔗 **Slack 연동**: Webhook URL 설정 및 테스트 알림 전송
- ℹ️ **API 정보**: 각 기능별 API 엔드포인트 안내

---

## 🔄 데이터 처리 흐름

### POS 데이터 업로드 프로세스
```
1. 사용자가 Excel 파일 선택 및 업로드
   ↓
2. xlsx 라이브러리로 파싱
   - 시트 탐색
   - "조회일자" 자동 인식
   ↓
3. 데이터 정제
   - 소계/합계 행 필터링
   - 숫자 형식 변환
   - null/undefined 처리
   ↓
4. 헤더 매핑
   - 총매출액, 실매출액 컬럼 위치 파악
   - 주문번호, 결제시각 추출
   ↓
5. sales_orders 테이블에 INSERT
   - order_number: 영수증번호 + 결제시각 조합
   - channel: 'POS'
   - gross_amount, net_amount 저장
   ↓
6. sales_items 테이블에 상품 정보 저장
   ↓
7. daily_summary 테이블 업데이트 (Server Action)
   - 해당 일자의 모든 채널 합계 계산
   - po_sales, total_sales 등 업데이트
```

### 배민 데이터 수집 프로세스
```
1. 사용자가 "배민 데이터 수집" 클릭
   ↓
2. Playwright로 원격 브라우저 실행
   - Browserless.io 연결 (또는 로컬 크롬)
   ↓
3. 배민 사장님광장 로그인 자동화
   - 아이디/비밀번호 입력
   - 2단계 인증 처리
   ↓
4. "주문현황" 페이지 탐색
   - 날짜 선택 (선택한 날짜)
   - API 인터셉트 활성화
   ↓
5. 주문 목록 데이터 추출
   - API response JSON 파싱
   - 주문번호, 가격, 상품명 등 추출
   ↓
6. sales_orders & sales_items 테이블에 저장
   - channel: 'BAEMIN'
   - 기존 데이터 삭제 후 재저장
```

### Slack 일일 리포트 프로세스
```
1. Vercel Cron Job 실행 (매일 오전 9시)
   ↓
2. /api/cron/daily-report 엔드포인트 호출
   ↓
3. 어제 날짜의 매출 데이터 조회
   - daily_summary 테이블에서 전일 데이터 로드
   ↓
4. Slack 메시지 포맷팅
   - 📊 제목: "일일 매출 리포트 (yyyy-mm-dd)"
   - 총 매출, POS 매출, 수기 매출 등 포함
   - 사람들이 쉽게 읽을 수 있는 형식
   ↓
5. Slack Webhook 호출
   - 환경변수 SLACK_WEBHOOK_URL 사용
   - POST 요청 전송
   ↓
6. Slack 채널에 메시지 표시
```

---

## 🌐 API 엔드포인트

### Server Actions (Form Submissions)
- `uploadPosData()` - POS Excel 파일 처리
- `uploadCoupangData()` - 쿠팡 데이터 처리
- `submitManualSales()` - 수기 매출 저장
- `aggregateDailySummary()` - 일별 요약 재계산
- `saveBaeminData()` - 배민 데이터 저장
- `setKpiTarget()` - KPI 목표 설정

### REST API Routes
- `GET /api/check-db` - DB 연결 상태 확인
- `POST /api/cron/daily-report` - 일일 리포트 (Cron)
- `POST /api/test-slack` - Slack 알림 테스트

---

## 📈 주요 데이터 쿼리 패턴

### 1. 오늘 총 매출 조회
```typescript
const { data } = await supabase
  .from('daily_summary')
  .select('total_sales')
  .eq('sale_date', today)
  .single();
```

### 2. 시간대별 매출 (08:00 ~ 21:00)
```typescript
const { data } = await supabase
  .from('sales_orders')
  .select('order_at, net_amount')
  .eq('sale_date', today)
  .gte('order_at', startOfDay)
  .lte('order_at', endOfDay);

// 시간별로 그룹화하여 집계
```

### 3. 채널별 매출 비중 (최근 30일)
```typescript
const { data } = await supabase
  .from('sales_items')
  .select('order_id, total_amount')
  .gte('sale_date', thirtyDaysAgo);
```

### 4. 상품별 TOP 5
```typescript
const { data } = await supabase
  .from('sales_items')
  .select('item_name, quantity, total_amount')
  .gte('sale_date', startDate)
  .lte('sale_date', endDate)
  .order('total_amount', { ascending: false })
  .limit(5);
```

---

## 🔐 환경변수 설정

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Slack
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...

# Baemin Crawler
BAEMIN_ID=your-baemin-id
BAEMIN_PASSWORD=your-baemin-password
BROWSERLESS_TOKEN=your-browserless-token (optional)

# Vercel
VERCEL_ENV=production
```

---

## 🚀 배포 및 운영

### Vercel에 배포
```bash
# 1. GitHub 연동 후 자동 배포 설정
# 2. 환경변수 설정 (.env.local 내용을 Vercel 대시보드에 등록)
# 3. Cron Job 활성화 (Vercel Pro 이상)
```

### Cron Job 설정
```json
{
  "crons": [{
    "path": "/api/cron/daily-report",
    "schedule": "0 9 * * *"  // 매일 오전 9시 (UTC 기준 조정 필요)
  }]
}
```

---

## 🐛 문제 해결

### DB 연결 안 됨
1. Supabase URL과 API Key 확인
2. `/settings` → DB 연결 확인 버튼으로 테스트
3. Supabase 대시보드에서 프로젝트 상태 확인

### 배민 크롤링 실패
1. 아이디/비밀번호 정확성 확인
2. 2단계 인증(OTP) 활성화 상태 확인
3. Playwright 브라우저 로그 확인
4. Browserless 토큰 유효성 확인

### Slack 알림 미수신
1. Webhook URL 정확성 확인
2. `/settings` → "Slack 테스트" 버튼으로 연결 테스트
3. Slack 채널 권한 확인

---

## 📚 추가 리소스

- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Recharts Documentation](https://recharts.org)
- [shadcn/ui](https://ui.shadcn.com)
- [Tailwind CSS](https://tailwindcss.com)

---

## 📝 라이선스

내부 프로젝트 (All Rights Reserved)

---

**마지막 업데이트**: 2026년 2월 5일
