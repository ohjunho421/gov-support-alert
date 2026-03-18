import { NextResponse } from "next/server";
import { matchNewPrograms } from "@/lib/matcher";

export async function POST() {
  try {
    const result = await matchNewPrograms();
    return NextResponse.json({
      success: true,
      matchCount: result.length,
      matches: result,
    });
  } catch (error) {
    console.error("[API/match] Error:", error);
    return NextResponse.json(
      { success: false, error: "Matching failed" },
      { status: 500 }
    );
  }
}
