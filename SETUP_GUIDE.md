# 🚀 빠른 시작 가이드 (오류 해결)

현재 두 가지 문제가 발생하고 있습니다:
1. ❌ Supabase Anon Key가 올바르지 않음
2. ❌ Supabase 테이블이 생성되지 않음

아래 단계를 **순서대로** 따라주세요.

---

## 1단계: Supabase에서 올바른 Anon Key 가져오기 ✅

### 방법:
1. 브라우저에서 https://supabase.com/dashboard 접속
2. 프로젝트 선택: **vupvqsjgisuhlscrumpw**
3. 왼쪽 메뉴에서 **⚙️ Settings** 클릭
4. **API** 메뉴 선택
5. **Project API keys** 섹션 찾기
6. **`anon` `public`** 키 복사 
   - ⚠️ 주의: 매우 긴 문자열입니다 (약 200+ 글자)
   - `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` 형태로 시작합니다

### 복사한 키를 적용:
`.env.local` 파일을 열어서 다음 줄을 수정하세요:

```env
NEXT_PUBLIC_SUPABASE_ANON_KEY="여기에_복사한_긴_키_붙여넣기"
```

**현재 값이 잘못되어 있습니다:**
```
❌ NEXT_PUBLIC_SUPABASE_ANON_KEY="sb_publishable_XEk93EL7bL7QEIYtvWwJWA_mclVByNz"
```

**올바른 형식 (예시):**
```
✅ NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ1cHZxc2pnaXN1aGxzY3J1bXB3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE2NDI1NzE0MzAsImV4cCI6MTk1ODE0NzQzMH0.abc123..."
```

---

## 2단계: Supabase에 테이블 생성 ✅

### 방법:
1. Supabase 대시보드에서 왼쪽 메뉴의 **🔧 SQL Editor** 클릭
2. **+ New query** 버튼 클릭
3. 프로젝트 폴더의 **`schema.sql`** 파일을 열어서 **전체 내용 복사**
4. SQL Editor에 붙여넣기
5. 오른쪽 아래 **Run** (또는 `Ctrl+Enter`) 버튼 클릭

### 성공 확인:
- 왼쪽 메뉴에서 **📊 Table Editor** 클릭
- 다음 3개의 테이블이 보여야 합니다:
  - ✅ `sales_records`
  - ✅ `daily_summary`
  - ✅ `manual_inputs`

---

## 3단계: 개발 서버 재시작 ✅

터미널에서:
1. `Ctrl+C` 눌러서 현재 서버 중지
2. 다시 시작:
   ```bash
   npm run dev
   ```

---

## 4단계: 브라우저에서 확인 ✅

http://localhost:3000 접속하여 다음을 확인:
- ✅ 오류 메시지가 사라졌는가?
- ✅ "POS 데이터 업로드" 카드가 보이는가?
- ✅ "영업 외 매출 수기 입력" 카드가 보이는가?

---

## 문제가 계속되면?

### Supabase 연결 테스트
터미널에서 다음을 실행:
```bash
curl https://vupvqsjgisuhlscrumpw.supabase.co/rest/v1/
```

성공하면 `{"message":"The server is running..."}` 같은 응답이 와야 합니다.

### 여전히 오류가 발생하면
1. `.env.local` 파일에 **따옴표**가 제대로 있는지 확인
2. Supabase 프로젝트가 **Paused** 상태가 아닌지 확인 (대시보드에서)
3. 브라우저 콘솔(F12)에서 자세한 오류 메시지 확인

---

## 다음 단계

모든 것이 정상 작동하면:
1. Excel 파일 업로드 테스트
2. 대시보드 확인 (http://localhost:3000/dashboard)
3. Slack Webhook URL 설정 (선택사항)

궁금한 점이 있으면 `README.md` 파일을 참고하세요!
