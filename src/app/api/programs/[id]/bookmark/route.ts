import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { matches } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const programId = parseInt(id, 10);
    const { bookmarked } = await request.json();

    await db
      .update(matches)
      .set({ bookmarked })
      .where(eq(matches.programId, programId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[API/bookmark] Error:", error);
    return NextResponse.json(
      { error: "Bookmark update failed" },
      { status: 500 }
    );
  }
}
