import { NextRequest, NextResponse } from "next/server";
import { collectAll } from "@/lib/collectors";
import { matchNewPrograms } from "@/lib/matcher";
import { sendDailyNotification } from "@/lib/telegram";

// This endpoint runs the full pipeline: collect -> match -> notify
// Called by external cron (Railway cron or cron-job.org)
export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    console.log("[Cron] Starting daily pipeline...");

    // Step 1: Collect
    const collectResult = await collectAll();
    console.log("[Cron] Collected:", collectResult);

    // Step 2: Match with AI
    const matchResult = await matchNewPrograms();
    console.log("[Cron] Matched:", matchResult.length);

    // Step 3: Notify via Telegram
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
