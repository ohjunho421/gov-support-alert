# Gov Support Alert

## 프로젝트 개요
블로그치트키를 위한 정부지원사업 매칭 알림 서비스

## 기술 스택
- Next.js 15 (App Router) + TypeScript
- Tailwind CSS + shadcn/ui
- PostgreSQL + Drizzle ORM
- Claude Haiku 4.5 (AI 매칭)
- Telegram Bot API (알림)
- Railway (배포)

## 핵심 파이프라인
1. 데이터 수집 (공공API + 크롤링) → src/lib/collectors/
2. AI 매칭 (Claude Haiku) → src/lib/matcher.ts
3. 텔레그램 알림 → src/lib/telegram.ts
4. 웹 대시보드 → src/app/page.tsx

## API 엔드포인트
- POST /api/collect - 데이터 수집
- POST /api/match - AI 매칭
- POST /api/notify - 텔레그램 알림
- POST /api/cron - 전체 파이프라인 (수집→매칭→알림)
- GET /api/programs - 프로그램 목록 조회
- PATCH /api/programs/[id]/bookmark - 찜하기 토글

## DB 마이그레이션
```bash
npx drizzle-kit generate
npx drizzle-kit push
```

## 규칙
- 단일 사용자 (블로그치트키 운영자)
- 일 1회 크론 실행 (수집 06:00, 알림 08:00)
- 관련도 7점 이상만 알림
