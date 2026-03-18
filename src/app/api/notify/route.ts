import { NextResponse } from "next/server";
import { sendDailyNotification } from "@/lib/telegram";

export async function POST() {
  try {
    const result = await sendDailyNotification();
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error("[API/notify] Error:", error);
    return NextResponse.json(
      { success: false, error: "Notification failed" },
      { status: 500 }
    );
  }
}
