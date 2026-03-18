import { db } from "../db";
import { govPrograms } from "../db/schema";
import { eq, and } from "drizzle-orm";
import { collectFromBizinfo } from "./bizinfo";
import { collectFromDataGoKr } from "./data-go-kr";
import { collectFromCrawling } from "./crawler";
import type { NewGovProgram } from "../db/schema";

async function isDuplicate(program: NewGovProgram): Promise<boolean> {
  const existing = await db
    .select({ id: govPrograms.id })
    .from(govPrograms)
    .where(
      and(
        eq(govPrograms.title, program.title),
        eq(govPrograms.source, program.source)
      )
    )
    .limit(1);

  return existing.length > 0;
}

export async function collectAll(): Promise<{
  total: number;
  newCount: number;
  sources: Record<string, number>;
}> {
  console.log("[Collector] Starting collection...");

  const [bizinfoData, dataGoKrData, crawledData] = await Promise.allSettled([
    collectFromBizinfo(),
    collectFromDataGoKr(),
    collectFromCrawling(),
  ]);

  const allPrograms: NewGovProgram[] = [
    ...(bizinfoData.status === "fulfilled" ? bizinfoData.value : []),
    ...(dataGoKrData.status === "fulfilled" ? dataGoKrData.value : []),
    ...(crawledData.status === "fulfilled" ? crawledData.value : []),
  ];

  const sources: Record<string, number> = {};
  let newCount = 0;

  for (const program of allPrograms) {
    if (!program.title) continue;

    const duplicate = await isDuplicate(program);
    if (duplicate) continue;

    await db.insert(govPrograms).values(program);
    newCount++;
    sources[program.source] = (sources[program.source] || 0) + 1;
  }

  console.log(
    `[Collector] Done: ${allPrograms.length} total, ${newCount} new`
  );

  return { total: allPrograms.length, newCount, sources };
}
