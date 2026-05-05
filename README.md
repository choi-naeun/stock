# stock-tracker

AI 기반 주식 동향 트래킹 & 일일 리포트 서비스. 본인 + 지인 10명 이내 클로즈드 베타, 월 0원 무료 티어.

## 구조

```
apps/
  web/      # Next.js 15 (Vercel)
  api/      # NestJS 11 (Render Free)
packages/
  shared/   # 공유 타입·DTO
  config/   # eslint·tsconfig·prettier
supabase/
  migrations/  # 0001~0009
  seed/        # glossary 30개
.github/workflows/
  ci.yml             # pnpm lint·typecheck·test·build
  daily-report.yml   # KST 07:00 cron → /api/cron/daily 트리거
```

## 요구 도구

- Node.js ≥ 20.11
- pnpm 10

## 로컬 셋업

```bash
pnpm install

# .env.local 두 개 생성: apps/api/.env.local, apps/web/.env.local
# (.env.example 참고. Supabase/Gemini/DART/Upstash 키 입력)

# Supabase Dashboard > SQL Editor 에서 0001~0009.sql + glossary.sql 실행
# Authentication > Providers > Email ON, allowlisted_emails 에 본인 이메일 추가

pnpm dev   # web:3000 + api:3001
```

브라우저: `http://localhost:3000/login` → 이메일 입력 → 매직 링크 → 대시보드.
첫 리포트 강제 발행: 로그인 후 DevTools Console에서

```js
fetch('http://localhost:3001/api/admin/reports/run?market=kr', {
  method: 'POST',
  headers: { 'Authorization': 'Bearer ' + JSON.parse(atob(document.cookie.match(/sb-[^=]+=base64-([^;]+)/)[1])).access_token }
}).then(r => r.json()).then(console.log)
```

## 배포

### 1. GitHub repo

```bash
git remote add origin git@github.com:<owner>/stock-tracker.git
git push -u origin main
```

`.env.local`은 `.gitignore` 처리되어 있으므로 안전.

### 2. Vercel (web)

- Dashboard → New Project → GitHub repo 선택
- **Root Directory**: `apps/web`
- 환경변수 등록:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `NEXT_PUBLIC_API_URL` (Render 배포 후 채움. 임시는 `https://placeholder`)
- Deploy → 배포 도메인 확보 (예: `xxx.vercel.app`)
- Supabase Dashboard > Authentication > URL Configuration 에 Vercel 도메인 + `/auth/callback` 추가

### 3. Render (api)

- Dashboard → New + → Blueprint → 같은 repo 선택 → `render.yaml` 자동 인식
- Free Web Service가 생성됨. 첫 배포 후 환경변수 직접 등록:
  - `WEB_ORIGIN` = Vercel 도메인
  - `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_JWT_SECRET`
  - `GEMINI_API_KEY`
  - `DART_API_KEY`
  - `SEC_EDGAR_USER_AGENT`
  - `ADMIN_EMAIL`
  - `OPS_SLACK_WEBHOOK` (선택)
  - `CRON_SECRET` 은 `render.yaml` 의 `generateValue: true` 로 자동 생성됨 → Dashboard에서 값 복사
- 배포 도메인 확보 (예: `stock-tracker-api.onrender.com`)
- Vercel 환경변수 `NEXT_PUBLIC_API_URL` 을 `https://stock-tracker-api.onrender.com/api` 로 갱신 → Vercel 재배포

### 4. GitHub Actions cron 시크릿

Repo Settings → Secrets and variables → Actions → New secret:
- `API_URL` = `https://stock-tracker-api.onrender.com`
- `CRON_SECRET` = Render에서 복사한 값

이후 매일 KST 07:00(`UTC 22:00`)·07:15에 GitHub Actions가 자동으로 `/api/cron/daily` 를 호출 → Render Free가 깨어나며 일일 리포트 생성.

### 5. Render Free 슬립 회피 (선택)

15분 idle 후 슬립합니다. cron 외 일상 사용에서도 빠른 응답을 원하면 [UptimeRobot 무료](https://uptimerobot.com)로 5분마다 `/api/health` 핑. 단, 무료 한도 750h/월을 초과하지 않는지 주의.

## 보안 & 프라이버시 원칙

- 비밀키·토큰은 코드·깃에 노출 금지. 각 플랫폼 시크릿에만.
- LLM 프롬프트에 평단·수량·이메일 마스킹 (`apps/api/src/llm-provider/sanitizer.ts`)
- Supabase RLS 기본 ON, 모든 사용자 테이블에 `user_id` 기반 정책
- 크롤링 금지 매체(네이버 종목토론방·Reddit 등) 사용 금지
- 모든 인용 URL은 수집 corpus 멤버십 + HTTP HEAD 검증을 거침 (LLM 환각 차단)

## Disclaimer

본 서비스는 정보 큐레이션 목적이며 자본시장법상 투자자문업·투자일임업이 아닙니다. 모든 리포트는 참고 자료이며, 투자 결정과 그 결과에 대한 책임은 사용자 본인에게 있습니다.
