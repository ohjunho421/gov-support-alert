import { NextRequest, NextResponse } from "next/server";
import { collectAll } from "@/lib/collectors";
import { matchNewPrograms } from "@/lib/matcher";
import { sendDailyNotification } from "@/lib/telegram";

// 전체 파이프라인 또는 매칭+알림만 실행
// ?skip=collect → 수집 건너뜀 (로컬에서 수집한 경우)
export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const skipCollect = request.nextUrl.searchParams.get("skip") === "collect";

  try {
    console.log("[Cron] Starting pipeline...", skipCollect ? "(skip collect)" : "");

    let collectResult = null;
    if (!skipCollect) {
      collectResult = await collectAll();
      console.log("[Cron] Collected:", collectResult);
    }

    const matchResult = await matchNewPrograms();
    console.log("[Cron] Matched:", matchResult.length);

    const notifyResult = await sendDailyNotification();
    console.log("[Cron] Notified:", notifyResult);

    return NextResponse.json({
      success: true,
      collected: collectResult,
      matched: matchResult.length,
      notified: notifyResult,
    });
  } catch (error) {
    console.error("[Cron] Pipeline error:", error);
    return NextResponse.json(
      { success: false, error: "Pipeline failed" },
      { status: 500 }
    );
  }
}
