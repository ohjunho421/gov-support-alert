import { NextResponse } from "next/server";
import { collectAll } from "@/lib/collectors";

export async function POST() {
  try {
    const result = await collectAll();
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error("[API/collect] Error:", error);
    return NextResponse.json(
      { success: false, error: "Collection failed" },
      { status: 500 }
    );
  }
}
