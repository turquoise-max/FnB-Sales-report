# F&B 매출 관리 대시보드

F&B 매장의 매출을 관리하고 시각화하는 웹 대시보드입니다. POS 데이터 업로드, 수기 매출 입력, 대시보드 시각화, Slack 알림 기능을 제공합니다.

## 기술 스택

- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS, Shadcn UI
- **Charts**: Recharts
- **Backend/DB**: Supabase (PostgreSQL)
- **File Processing**: xlsx
- **Notification**: Slack Webhook API
- **Deployment**: Vercel

## 주요 기능

### 1. POS 데이터 업로드 및 파싱
- Excel 파일(xlsx, xls) 업로드
- 자동 날짜 추출 (파일 내 "조회일자" 형식 인식)
- 데이터 정제 (소계/합계 행 제외, 숫자 변환)
- 실시간 DB 저장

### 2. 영업 외 매출 수기 입력
- 날짜, 항목명, 금액 입력 폼
- `manual_inputs`, `sales_records`, `daily_summary` 테이블에 자동 반영

### 3. 대시보드
- **KPI 카드**: 오늘 총 매출, 전일 대비 증감율, 이번 달 누적 매출
- **라인 차트**: 최근 30일 일별 매출 추이
- **파이 차트**: 카테고리별 매출 비중
- **베스트 메뉴**: 판매량 기준 TOP 5

### 4. Slack 일일 리포트
- 매일 오전 9시 어제 매출 실적을 Slack으로 자동 전송
- Vercel Cron Jobs를 통한 스케줄링

## 설치 및 설정

### 1. 프로젝트 클론 및 의존성 설치

```bash
cd fnb-dashboard
npm install
```

### 2. Supabase 설정

1. [Supabase](https://supabase.com/)에서 새 프로젝트 생성
2. SQL Editor에서 `schema.sql` 파일의 내용을 실행하여 테이블 생성:
   - `sales_records`
   - `daily_summary`
   - `manual_inputs`

### 3. 환경 변수 설정

`.env.local` 파일을 열고 다음 값을 채워주세요:

```env
# Supabase Project URL
NEXT_PUBLIC_SUPABASE_URL="https://your-project-id.supabase.co"

# Supabase Anonymous Key
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key"

# Slack Webhook URL
SLACK_WEBHOOK_URL="https://hooks.slack.com/services/YOUR/WEBHOOK/URL"
```

**Supabase 키 찾기:**
- Supabase 대시보드 → Settings → API → Project URL 및 anon public key

**Slack Webhook URL 생성:**
1. [Slack API](https://api.slack.com/apps)에서 새 앱 생성
2. "Incoming Webhooks" 활성화
3. Webhook URL 복사

### 4. 개발 서버 실행

```bash
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000) 접속

## 사용 방법

### POS 데이터 업로드
1. 메인 페이지(`/`)에서 "POS 데이터 업로드" 카드 찾기
2. 엑셀 파일 선택 (파일 내에 "조회일자" 있으면 자동 인식)
3. 날짜가 파일에 없으면 직접 선택
4. "업로드 및 데이터 처리" 클릭

### 영업 외 매출 입력
1. 메인 페이지(`/`)에서 "영업 외 매출 수기 입력" 카드 찾기
2. 날짜, 항목명, 금액 입력
3. "저장하기" 클릭

### 대시보드 확인
1. 메인 페이지 상단의 "→ 대시보드 보기" 링크 클릭
2. `/dashboard` 페이지에서 KPI, 차트, 베스트 메뉴 확인

## Vercel 배포 및 Cron Jobs 설정

### 1. Vercel에 배포

```bash
# Vercel CLI 설치 (처음 한 번만)
npm install -g vercel

# 배포
vercel
```

또는 [Vercel 대시보드](https://vercel.com/)에서 GitHub 레포지토리 연동

### 2. 환경 변수 설정
Vercel 대시보드 → Settings → Environment Variables에서 `.env.local`의 모든 변수 추가

### 3. Cron Jobs 확인
- `vercel.json` 파일에 크론 작업이 이미 설정되어 있습니다.
- 매일 오전 9시(UTC 기준 0시)에 `/api/cron/daily-report` 실행
- 한국 시간 기준으로 변경하려면 `schedule` 값을 조정하세요:
  - `"0 0 * * *"` → 한국 시간 오전 9시 (UTC 0시)
  - `"0 9 * * *"` → 한국 시간 오후 6시 (UTC 9시)

**참고:** Vercel의 Cron Jobs는 Pro 플랜부터 사용 가능합니다. Hobby 플랜의 경우 외부 크론 서비스(예: [cron-job.org](https://cron-job.org/))를 사용하여 `/api/cron/daily-report` 엔드포인트를 호출할 수 있습니다.

### 4. 수동으로 Slack 리포트 테스트

```bash
curl https://your-domain.vercel.app/api/cron/daily-report
```

## 프로젝트 구조

```
fnb-dashboard/
├── src/
│   ├── app/
│   │   ├── actions.ts              # 서버 액션 (업로드, 수기입력)
│   │   ├── page.tsx                # 메인 페이지
│   │   ├── dashboard/
│   │   │   └── page.tsx            # 대시보드 페이지
│   │   └── api/
│   │       └── cron/
│   │           └── daily-report/
│   │               └── route.ts    # Slack 알림 API
│   ├── components/
│   │   ├── FileUpload.tsx          # POS 파일 업로드
│   │   ├── ManualInputForm.tsx     # 수기 입력 폼
│   │   ├── charts/
│   │   │   ├── LineChart.tsx       # 라인 차트
│   │   │   └── PieChart.tsx        # 파이 차트
│   │   └── ui/                     # Shadcn UI 컴포넌트
│   └── lib/
│       ├── supabaseClient.ts       # Supabase 클라이언트
│       ├── dashboard-data.ts       # 대시보드 데이터 조회
│       └── utils.ts                # 유틸리티 함수
├── schema.sql                       # Supabase 테이블 스키마
├── vercel.json                      # Vercel Cron Jobs 설정
└── README.md
```

## 데이터베이스 스키마

### sales_records
매출 상세 데이터 (POS + 수기 입력)

### daily_summary
일별 합계 (총 매출, POS 매출, 수기 매출)

### manual_inputs
영업 외 매출 수기 입력 내역

## 문제 해결

### Supabase 연결 실패
- `.env.local`의 URL과 키가 정확한지 확인
- Supabase 프로젝트가 활성화되어 있는지 확인

### 차트가 표시되지 않음
- 브라우저 콘솔에서 에러 확인
- 데이터가 DB에 있는지 Supabase 대시보드에서 확인

### Slack 알림이 오지 않음
- Slack Webhook URL이 정확한지 확인
- `/api/cron/daily-report`를 브라우저에서 직접 호출하여 테스트
- Vercel 로그에서 에러 메시지 확인

## 라이선스

MIT

## 작성자

F&B 매출 관리 대시보드 - 2026
