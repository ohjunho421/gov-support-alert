import axios from "axios";
import { db } from "./db";
import { matches, govPrograms, notifications } from "./db/schema";
import { eq, and, desc } from "drizzle-orm";
import type { Match, GovProgram } from "./db/schema";

const TELEGRAM_API = "https://api.telegram.org/bot";

async function sendMessage(text: string): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    console.warn("[Telegram] Bot token or chat ID not set");
    return false;
  }

  try {
    await axios.post(`${TELEGRAM_API}${token}/sendMessage`, {
      chat_id: chatId,
      text,
      parse_mode: "HTML",
      disable_web_page_preview: true,
    });
    return true;
  } catch (error) {
    console.error("[Telegram] Send failed:", error);
    return false;
  }
}

function formatNotification(
  match: Match,
  program: GovProgram,
  appUrl: string
): string {
  const deadlineStr = program.deadline
    ? `📅 마감일: ${program.deadline}`
    : "📅 마감일: 미정";

  return `🏛️ <b>정부지원사업 알림</b>

📌 <b>${program.title}</b>
🏢 ${program.organization || "미정"}
${program.supportAmount ? `💰 ${program.supportAmount}` : ""}
${deadlineStr}
🎯 관련도: ${match.relevanceScore}/10

💡 <b>블로그치트키 매칭 포인트:</b>
${match.aiSummary}

${program.applyUrl ? `🔗 <a href="${program.applyUrl}">원문 보기</a>` : ""}
🔗 <a href="${appUrl}/programs/${program.id}">대시보드에서 보기</a>`;
}

export async function sendDailyNotification(): Promise<{
  sent: number;
  failed: number;
}> {
  console.log("[Telegram] Sending daily notification...");

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const threshold = parseInt(process.env.RELEVANCE_THRESHOLD || "7", 10);

  // Get unnotified matches above threshold
  const unnotifiedMatches = await db
    .select({
      match: matches,
      program: govPrograms,
    })
    .from(matches)
    .innerJoin(govPrograms, eq(matches.programId, govPrograms.id))
    .where(and(eq(matches.notified, false)))
    .orderBy(desc(matches.relevanceScore));

  const relevantMatches = unnotifiedMatches.filter(
    (m) => m.match.relevanceScore >= threshold
  );

  if (relevantMatches.length === 0) {
    console.log("[Telegram] No new matches to notify");
    return { sent: 0, failed: 0 };
  }

  // Send summary header
  const today = new Date().toISOString().split("T")[0];
  await sendMessage(
    `📢 <b>${today} 정부지원사업 알림</b>\n\n새로운 매칭 ${relevantMatches.length}건이 발견되었습니다.`
  );

  let sent = 0;
  let failed = 0;

  for (const { match, program } of relevantMatches) {
    const message = formatNotification(match, program, appUrl);
    const success = await sendMessage(message);

    await db.insert(notifications).values({
      matchId: match.id,
      channel: "telegram",
      sentAt: success ? new Date() : null,
      status: success ? "sent" : "failed",
    });

    await db
      .update(matches)
      .set({ notified: true })
      .where(eq(matches.id, match.id));

    if (success) sent++;
    else failed++;

    // Rate limit: 1 message per second
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  console.log(`[Telegram] Done: ${sent} sent, ${failed} failed`);
  return { sent, failed };
}
