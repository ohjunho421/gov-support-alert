import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { govPrograms, matches } from "@/lib/db/schema";
import { desc, eq, sql, gte } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const filter = searchParams.get("filter") || "all";
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = 20;
    const offset = (page - 1) * limit;

    let query;

    if (filter === "matched") {
      query = db
        .select({
          program: govPrograms,
          match: matches,
        })
        .from(govPrograms)
        .innerJoin(matches, eq(govPrograms.id, matches.programId))
        .where(gte(matches.relevanceScore, 7))
        .orderBy(desc(matches.relevanceScore))
        .limit(limit)
        .offset(offset);
    } else if (filter === "bookmarked") {
      query = db
        .select({
          program: govPrograms,
          match: matches,
        })
        .from(govPrograms)
        .innerJoin(matches, eq(govPrograms.id, matches.programId))
        .where(eq(matches.bookmarked, true))
        .orderBy(desc(matches.relevanceScore))
        .limit(limit)
        .offset(offset);
    } else {
      query = db
        .select({
          program: govPrograms,
          match: matches,
        })
        .from(govPrograms)
        .leftJoin(matches, eq(govPrograms.id, matches.programId))
        .orderBy(desc(govPrograms.collectedAt))
        .limit(limit)
        .offset(offset);
    }

    const results = await query;

    const [countResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(govPrograms);

    return NextResponse.json({
      programs: results,
      total: countResult.count,
      page,
      totalPages: Math.ceil(countResult.count / limit),
    });
  } catch (error) {
    console.error("[API/programs] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch programs" },
      { status: 500 }
    );
  }
}
