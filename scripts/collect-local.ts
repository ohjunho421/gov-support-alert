/**
 * 로컬 전체 파이프라인 스크립트
 *
 * 한국 IP에서 정부 API/사이트를 호출하여 데이터를 수집하고
 * Railway PostgreSQL에 저장 → AI 매칭 → 텔레그램 알림까지 모두 로컬에서 실행합니다.
 *
 * 사용법: npm run pipeline
 * 개별 실행: npm run collect / npm run match / npm run notify
 * Windows 작업 스케줄러로 매일 자동 실행 가능
 */

import "dotenv/config";
import { collectAll } from "../src/lib/collectors";
import { matchNewPrograms } from "../src/lib/matcher";
import { sendDailyNotification } from "../src/lib/telegram";
import { getDb } from "../src/lib/db";

type Step = "collect" | "match" | "notify" | "all";

function getStep(): Step {
  const arg = process.argv[2];
  if (arg === "collect" || arg === "match" || arg === "notify") return arg;
  return "all";
}

async function runCollect() {
  console.log("\n=== 1단계: 데이터 수집 ===");
  const result = await collectAll();
  console.log(`수집 완료: 총 ${result.total}개, 신규 ${result.newCount}개`);
  console.log("소스별:", result.sources);
  return result;
}

async function runMatch() {
  console.log("\n=== 2단계: AI 매칭 ===");
  const newMatches = await matchNewPrograms();
  console.log(`매칭 완료: ${newMatches.length}건 (관련도 7점 이상)`);
  return newMatches;
}

async function runNotify() {
  console.log("\n=== 3단계: 텔레그램 알림 ===");
  const result = await sendDailyNotification();
  console.log(`알림 완료: 성공 ${result.sent}건, 실패 ${result.failed}건`);
  return result;
}

async function main() {
  const step = getStep();

  // DB 연결 확인
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error("DATABASE_URL이 .env에 설정되지 않았습니다");
    process.exit(1);
  }

  console.log(`=== 로컬 파이프라인 시작 (${step}) ===`);
  console.log(`DB: ${databaseUrl.replace(/:[^:@]+@/, ":***@")}`);
  console.log(`시간: ${new Date().toLocaleString("ko-KR")}`);

  // DB 연결 초기화 (import 시 자동 연결되지만 명시적으로 확인)
  getDb();

  try {
    switch (step) {
      case "collect":
        await runCollect();
        break;

      case "match":
        await runMatch();
        break;

      case "notify":
        await runNotify();
        break;

      case "all": {
        const collected = await runCollect();

        if (collected.newCount > 0) {
          await runMatch();
          await runNotify();
        } else {
          console.log("\n신규 데이터 없음 - 매칭/알림 건너뜀");
        }
        break;
      }
    }
  } catch (error) {
    console.error("파이프라인 오류:", error);
    process.exit(1);
  }

  console.log("\n=== 완료 ===");
  process.exit(0);
}

main();
