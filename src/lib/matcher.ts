import Anthropic from "@anthropic-ai/sdk";
import { db } from "./db";
import { govPrograms, matches } from "./db/schema";
import { eq, isNull, and, desc } from "drizzle-orm";
import { BLOGCHEATKEY_PROFILE } from "./profile";
import type { GovProgram, NewMatch } from "./db/schema";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const RELEVANCE_THRESHOLD = parseInt(
  process.env.RELEVANCE_THRESHOLD || "7",
  10
);

interface MatchResult {
  relevanceScore: number;
  summary: string;
  matchingPoints: string;
}

async function evaluateProgram(program: GovProgram): Promise<MatchResult> {
  const prompt = `당신은 정부지원사업 매칭 전문가입니다. 아래 정부지원사업이 "블로그치트키" 서비스에 얼마나 관련이 있는지 평가해주세요.

## 블로그치트키 프로필
- 서비스: ${BLOGCHEATKEY_PROFILE.description}
- 사업 유형: ${BLOGCHEATKEY_PROFILE.businessType}
- 분야: ${BLOGCHEATKEY_PROFILE.industry.join(", ")}
- 타겟 고객: ${BLOGCHEATKEY_PROFILE.targetCustomers}
- 기술: ${BLOGCHEATKEY_PROFILE.techStack.join(", ")}
- 수익 모델: ${BLOGCHEATKEY_PROFILE.revenueModel}
- 사업 단계: ${BLOGCHEATKEY_PROFILE.stage}

## 정부지원사업 정보
- 사업명: ${program.title}
- 설명: ${program.description || "정보 없음"}
- 주관기관: ${program.organization || "정보 없음"}
- 지원금액: ${program.supportAmount || "정보 없음"}
- 마감일: ${program.deadline || "정보 없음"}
- 카테고리: ${program.category || "정보 없음"}

## 응답 형식 (JSON만 출력)
{
  "relevanceScore": (1-10 정수, 10이 가장 관련 높음),
  "summary": "블로그치트키의 [구체적 부분]에 [어떤 지원]을 받을 수 있습니다. [핵심 조건/금액 요약]",
  "matchingPoints": "매칭 이유 1~2줄"
}`;

  const response = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 500,
    messages: [{ role: "user", content: prompt }],
  });

  const text =
    response.content[0].type === "text" ? response.content[0].text : "";

  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON found in response");
    return JSON.parse(jsonMatch[0]);
  } catch {
    return {
      relevanceScore: 1,
      summary: "매칭 분석 실패",
      matchingPoints: "",
    };
  }
}

export async function matchNewPrograms(): Promise<NewMatch[]> {
  console.log("[Matcher] Starting AI matching...");

  // Find programs that haven't been matched yet
  const unmatchedPrograms = await db
    .select()
    .from(govPrograms)
    .where(eq(govPrograms.status, "active"))
    .orderBy(desc(govPrograms.collectedAt))
    .limit(30);

  const existingMatchProgramIds = await db
    .select({ programId: matches.programId })
    .from(matches);

  const matchedIds = new Set(existingMatchProgramIds.map((m) => m.programId));
  const toMatch = unmatchedPrograms.filter((p) => !matchedIds.has(p.id));

  if (toMatch.length === 0) {
    console.log("[Matcher] No new programs to match");
    return [];
  }

  console.log(`[Matcher] Evaluating ${toMatch.length} programs...`);

  const newMatches: NewMatch[] = [];

  for (const program of toMatch) {
    const result = await evaluateProgram(program);

    const matchData: NewMatch = {
      programId: program.id,
      relevanceScore: result.relevanceScore,
      aiSummary: result.summary,
      matchingPoints: result.matchingPoints,
      notified: false,
      bookmarked: false,
    };

    const [inserted] = await db.insert(matches).values(matchData).returning();
    if (result.relevanceScore >= RELEVANCE_THRESHOLD) {
      newMatches.push(inserted);
    }
  }

  console.log(
    `[Matcher] Done: ${newMatches.length} relevant matches (>=${RELEVANCE_THRESHOLD})`
  );

  return newMatches;
}
