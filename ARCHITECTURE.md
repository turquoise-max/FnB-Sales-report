# F&B 매출 관리 대시보드 아키텍처 문서

## 📋 목차
1. [프로젝트 개요](#프로젝트-개요)
2. [기술 스택](#기술-스택)
3. [시스템 아키텍처](#시스템-아키텍처)
4. [데이터 흐름](#데이터-흐름)
5. [주요 컴포넌트](#주요-컴포넌트)
6. [데이터베이스 구조](#데이터베이스-구조)
7. [API 엔드포인트](#api-엔드포인트)
8. [배포 및 환경설정](#배포-및-환경설정)

---

## 프로젝트 개요

### 목적
F&B (Food & Beverage) 매장의 일일 매출 데이터를 통합 관리하고, 실시간으로 시각화하여 의사결정을 지원하는 웹 애플리케이션

### 핵심 기능
- **POS 데이터 자동 업로드**: Excel 파일 업로드 및 자동 파싱
- **수기 매출 입력**: 배달, 케이터링 등 POS에 잡히지 않는 매출 관리
- **실시간 대시보드**: KPI, 차트, 증감률 분석
- **누적 데이터 조회**: 다양한 뷰로 매출 데이터 확인
- **Slack 알림**: 일일 매출 리포트 자동 전송

---

## 기술 스택

### Frontend
- **Next.js 14** (App Router): React 기반 풀스택 프레임워크
- **TypeScript**: 타입 안전성 및 개발 생산성 향상
- **Tailwind CSS**: 유틸리티 우선 CSS 프레임워크
- **Shadcn UI**: 재사용 가능한 컴포넌트 라이브러리
- **Recharts**: 데이터 시각화 라이브러리

### Backend & Database
- **Supabase**: PostgreSQL 기반 BaaS (Backend as a Service)
  - 실시간 데이터베이스
  - RESTful API 자동 생성
  - Row Level Security

### 라이브러리
- **xlsx**: Excel 파일 파싱
- **date-fns**: 날짜 처리 및 조작
- **lucide-react**: 아이콘 라이브러리
- **next-themes**: 다크모드 구현

### 배포 & 자동화
- **Vercel**: 호스팅 및 CI/CD
- **Vercel Cron Jobs**: 스케줄링 작업
- **Slack Webhook API**: 메시지 전송

---

## 시스템 아키텍처

```
┌─────────────────────────────────────────────────────────────┐
│                         사용자                               │
└────────────┬────────────────────────────────────┬───────────┘
             │                                    │
             ▼                                    ▼
┌────────────────────────┐          ┌──────────────────────────┐
│   웹 브라우저           │          │   Slack                  │
│   (Next.js Frontend)   │          │   (알림 수신)            │
└────────────┬───────────┘          └─────────▲────────────────┘
             │                                 │
             │ HTTP/HTTPS                     │ Webhook
             ▼                                 │
┌──────────────────────────────────────────────┴───────────────┐
│                    Vercel (Hosting)                          │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              Next.js Application                      │   │
│  │                                                        │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌──────────────┐ │   │
│  │  │   Pages     │  │  API Routes │  │ Server Actions│ │   │
│  │  │ (App Router)│  │  /api/*     │  │  actions.ts  │ │   │
│  │  └─────────────┘  └─────────────┘  └──────────────┘ │   │
│  └─────────────────────────┬──────────────────────────────┘  │
│                            │                                   │
│  ┌─────────────────────────▼──────────────────────────────┐  │
│  │            Vercel Cron Jobs                            │  │
│  │   (매일 9시 daily-report 실행)                         │  │
│  └────────────────────────────────────────────────────────┘  │
└────────────────────────────┬───────────────────────────────┘
                             │
                             │ Supabase Client
                             ▼
┌──────────────────────────────────────────────────────────────┐
│                    Supabase (Backend)                        │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              PostgreSQL Database                      │   │
│  │                                                        │   │
│  │  ┌─────────────────┐  ┌─────────────────────────┐   │   │
│  │  │ sales_records   │  │   daily_summary         │   │   │
│  │  └─────────────────┘  └─────────────────────────┘   │   │
│  │  ┌─────────────────┐                                 │   │
│  │  │ manual_inputs   │                                 │   │
│  │  └─────────────────┘                                 │   │
│  └──────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────┘
```

---

## 데이터 흐름

### 1. POS 데이터 업로드 플로우
```
[사용자] 
   │ Excel 파일 선택
   ▼
[FileUpload.tsx]
   │ FormData 생성
   ▼
[uploadExcelData() - actions.ts]
   │ 1. 파일 파싱 (xlsx)
   │ 2. 날짜 추출
   │ 3. 헤더 매핑
   │ 4. 데이터 검증 및 필터링
   ▼
[Supabase]
   │ INSERT → sales_records
   │ UPSERT → daily_summary
   ▼
[Response]
   │ 성공/실패 메시지
   ▼
[사용자에게 피드백]
```

### 2. 대시보드 렌더링 플로우
```
[사용자] → [/dashboard]
   ▼
[dashboard/page.tsx]
   │ Server Component
   ▼
[dashboard-data.ts]
   │ getKpiData()
   │ getChartData()
   │ getTrendData()
   │ getBestSellers()
   ▼
[Supabase Query]
   │ SELECT FROM daily_summary
   │ SELECT FROM sales_records
   ▼
[데이터 가공]
   │ 집계, 정렬, 계산
   ▼
[차트 컴포넌트]
   │ LineChart.tsx
   │ PieChartWithFilter.tsx
   ▼
[사용자에게 시각화 표시]
```

### 3. Slack 알림 플로우
```
[Vercel Cron] → 매일 9시
   ▼
[/api/cron/daily-report]
   │ 1. 어제 날짜 계산
   │ 2. daily_summary 조회
   ▼
[Slack Webhook API]
   │ POST 메시지
   ▼
[Slack 채널]
   │ 매출 리포트 표시
```

---

## 주요 컴포넌트

### 페이지 구조 (App Router)

```
src/app/
├── page.tsx                  # 홈/랜딩 페이지
├── layout.tsx                # 루트 레이아웃 (사이드바 포함)
├── data-input/
│   └── page.tsx              # 데이터 입력 페이지
├── data-view/
│   └── page.tsx              # 누적 데이터 조회 페이지
├── dashboard/
│   └── page.tsx              # 대시보드 페이지
├── settings/
│   └── page.tsx              # 설정 페이지
└── api/
    ├── check-db/route.ts     # DB 연결 확인
    ├── test-slack/route.ts   # Slack 테스트
    └── cron/
        └── daily-report/route.ts  # 일일 리포트 크론
```

### 컴포넌트 계층 구조

```
App
├── ThemeProvider (다크모드)
├── Sidebar (네비게이션)
└── Main Content
    ├── 데이터 입력 페이지
    │   ├── FileUpload (POS 업로드)
    │   └── MultiRowInputForm (수기 입력)
    │
    ├── 누적 데이터 페이지
    │   └── Tabs
    │       ├── 전체 레코드 (Table)
    │       ├── 일별 요약 (Table)
    │       ├── 카테고리별 (Table)
    │       └── 상품별 (Table)
    │
    ├── 대시보드 페이지
    │   ├── KPI Cards (3개)
    │   ├── 증감률 Cards (주별/월별)
    │   ├── SalesLineChart (30일 추이)
    │   ├── PieChartWithFilter (카테고리/상품별)
    │   └── BestSellers List
    │
    └── 설정 페이지
        ├── ThemeToggle
        ├── DB 연결 확인
        └── Slack 테스트
```

### 핵심 Server Actions (actions.ts)

1. **uploadExcelData()**
   - Excel 파일 파싱 및 DB 저장
   - 데이터 검증 및 필터링
   - 트랜잭션 처리

2. **addManualInput()**
   - 단일 수기 입력 처리

3. **addMultipleManualInputs()**
   - 다중 수기 입력 일괄 처리

---

## 데이터베이스 구조

### ER 다이어그램

```
┌─────────────────────────────────────┐
│         sales_records                │
│─────────────────────────────────────│
│ id (UUID, PK)                        │
│ sale_date (DATE)                     │◄───┐
│ category (TEXT)                      │    │
│ item_name (TEXT)                     │    │
│ quantity (INT)                       │    │
│ total_amount (INT)                   │    │
│ discount_amount (INT)                │    │
│ net_amount (INT)                     │    │
│ source (TEXT: 'POS'|'MANUAL')       │    │
│ payment_method (TEXT, nullable)      │    │
│ created_at (TIMESTAMP)               │    │
└─────────────────────────────────────┘    │
                                            │
┌─────────────────────────────────────┐    │
│         daily_summary                │    │
│─────────────────────────────────────│    │
│ sale_date (DATE, PK)                 │────┘
│ total_sales (INT)                    │  (1:N 관계)
│ pos_sales (INT)                      │
│ manual_sales (INT)                   │
│ created_at (TIMESTAMP)               │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│         manual_inputs                │
│─────────────────────────────────────│
│ id (UUID, PK)                        │
│ sale_date (DATE)                     │
│ description (TEXT)                   │
│ amount (INT)                         │
│ created_at (TIMESTAMP)               │
└─────────────────────────────────────┘
```

### 테이블 상세

#### sales_records
매출 상세 레코드 (POS + 수기 입력 통합)

- **인덱스**: `sale_date`, `category`, `source`
- **용도**: 상품별/카테고리별 분석, 트렌드 분석
- **Row Level Security**: 비활성화 (내부 사용)

#### daily_summary
일별 집계 데이터

- **Primary Key**: `sale_date`
- **용도**: 빠른 일별 조회, 대시보드 KPI
- **업데이트 방식**: UPSERT (동일 날짜 데이터 재업로드 시)

#### manual_inputs
영업 외 매출 원본 기록

- **용도**: 수기 입력 이력 추적, 감사
- **관계**: sales_records와 독립적으로 유지

---

## API 엔드포인트

### Server Actions (서버 측 함수)

| 함수명 | 용도 | 입력 | 출력 |
|--------|------|------|------|
| `uploadExcelData` | POS 파일 업로드 | FormData (file, saleDate) | {success} or {error} |
| `addManualInput` | 단일 수기 입력 | FormData (date, description, amount) | {success} or {error} |
| `addMultipleManualInputs` | 다중 수기 입력 | FormData (date, rows[]) | {success} or {error} |

### API Routes

| 경로 | 메서드 | 용도 |
|------|--------|------|
| `/api/check-db` | GET | Supabase 연결 확인 |
| `/api/test-slack` | POST | Slack 테스트 메시지 전송 |
| `/api/cron/daily-report` | GET | 일일 리포트 생성 및 Slack 전송 |

---

## 배포 및 환경설정

### 환경 변수 (.env.local)

```bash
# Supabase 연결 정보
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6...

# Slack Webhook (서버 전용)
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...
```

### Vercel 배포

1. **GitHub 연동**
   ```bash
   git push origin main
   # Vercel이 자동으로 빌드 및 배포
   ```

2. **환경 변수 설정**
   - Vercel Dashboard → Settings → Environment Variables
   - 위의 모든 환경 변수 추가

3. **Cron Jobs 설정** (`vercel.json`)
   ```json
   {
     "crons": [{
       "path": "/api/cron/daily-report",
       "schedule": "0 9 * * *"  // 매일 9시 (UTC)
     }]
   }
   ```

### 로컬 개발 환경

```bash
# 의존성 설치
npm install

# 개발 서버 실행
npm run dev

# 빌드
npm run build

# 프로덕션 모드 실행
npm start
```

---

## 보안 고려사항

1. **API 키 관리**
   - 클라이언트 노출 최소화
   - 서버 환경 변수 사용

2. **Supabase Row Level Security**
   - 필요 시 RLS 정책 추가

3. **입력 검증**
   - Server Actions에서 모든 입력 검증
   - TypeScript 타입 체크

4. **CORS**
   - Next.js 자체 API로 제한

---

## 성능 최적화

1. **Server Components**
   - 대시보드 데이터를 서버에서 미리 로드
   - 클라이언트 JavaScript 최소화

2. **데이터베이스 인덱스**
   - `sale_date` 인덱스로 빠른 날짜 조회

3. **캐싱**
   - Next.js 자동 캐싱 활용
   - Supabase 쿼리 최적화

4. **이미지 최적화**
   - Next.js Image 컴포넌트 사용

---

## 향후 개선 방향

1. **인증 시스템**: 사용자별 권한 관리
2. **실시간 대시보드**: Supabase Realtime 활용
3. **고급 분석**: 예측 분석, 시계열 예측
4. **모바일 앱**: React Native 연동
5. **다중 매장 지원**: 매장별 데이터 분리

---

## 문의 및 지원

- **문서 버전**: 1.0.0
- **최종 업데이트**: 2026-01-20
- **작성자**: F&B Dashboard Development Team
