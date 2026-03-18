# Gov Support Alert

## 프로젝트 개요
블로그치트키를 위한 정부지원사업 매칭 알림 서비스

## 기술 스택
- Next.js 15 (App Router) + TypeScript
- Tailwind CSS + shadcn/ui
- PostgreSQL + Drizzle ORM
- Claude Haiku 4.5 (AI 매칭)
- Telegram Bot API (알림)
- Railway (DB + 대시보드), 로컬 (파이프라인)

## 핵심 파이프라인 (로컬 실행)
1. 데이터 수집 (공공API + 크롤링) → src/lib/collectors/
2. AI 매칭 (Claude Haiku) → src/lib/matcher.ts
3. 텔레그램 알림 → src/lib/telegram.ts
4. 웹 대시보드 → src/app/page.tsx (Railway 배포)

## 로컬 파이프라인 실행
```bash
# 전체 파이프라인 (수집 → 매칭 → 알림)
npm run pipeline

# 개별 단계 실행
npm run collect    # 데이터 수집만
npm run match      # AI 매칭만
npm run notify     # 텔레그램 알림만
```
Windows 작업 스케줄러: `scripts/run-pipeline.bat` 등록

## API 엔드포인트
- POST /api/collect - 데이터 수집
- POST /api/match - AI 매칭
- POST /api/notify - 텔레그램 알림
- POST /api/cron - 전체 파이프라인 (?skip=collect로 수집 건너뛰기 가능)
- GET /api/programs - 프로그램 목록 조회
- PATCH /api/programs/[id]/bookmark - 찜하기 토글

## DB 마이그레이션
```bash
npx drizzle-kit generate
npx drizzle-kit push
```

## 규칙
- 단일 사용자 (블로그치트키 운영자)
- 로컬에서 일 1회 크론 실행 (수집+매칭+알림)
- 관련도 7점 이상만 알림
- 공공 API는 한국 IP에서만 호출 가능 → 반드시 로컬에서 수집

# currentDate
Today's date is 2026-03-18.

      IMPORTANT: this context may or may not be relevant to your tasks. You should not respond to this context directly unless it is highly relevant to your task.
