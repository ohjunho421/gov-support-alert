"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  RefreshCw,
  Bookmark,
  BookmarkCheck,
  ExternalLink,
  Zap,
  Calendar,
  Building2,
  TrendingUp,
  Filter,
  Loader2,
} from "lucide-react";

interface GovProgram {
  id: number;
  title: string;
  description: string | null;
  organization: string | null;
  supportAmount: string | null;
  deadline: string | null;
  applyUrl: string | null;
  source: string;
  category: string | null;
  region: string | null;
  collectedAt: string;
}

interface MatchData {
  id: number;
  programId: number;
  relevanceScore: number;
  aiSummary: string | null;
  matchingPoints: string | null;
  notified: boolean;
  bookmarked: boolean;
}

interface ProgramWithMatch {
  program: GovProgram;
  match: MatchData | null;
}

type FilterType = "all" | "matched" | "bookmarked";

function getScoreColor(score: number): string {
  if (score >= 9) return "text-emerald-600 bg-emerald-50 border-emerald-200";
  if (score >= 7) return "text-blue-600 bg-blue-50 border-blue-200";
  if (score >= 5) return "text-amber-600 bg-amber-50 border-amber-200";
  return "text-zinc-500 bg-zinc-50 border-zinc-200";
}

function getSourceLabel(source: string): string {
  const labels: Record<string, string> = {
    bizinfo: "기업마당",
    "data-go-kr": "공공데이터",
    "k-startup": "K-Startup",
    kised: "창업진흥원",
  };
  return labels[source] || source;
}

function ProgramCard({
  item,
  onBookmark,
}: {
  item: ProgramWithMatch;
  onBookmark: (id: number, bookmarked: boolean) => void;
}) {
  const { program, match } = item;
  const isBookmarked = match?.bookmarked || false;

  return (
    <div className="rounded-xl border border-border bg-card p-5 transition-all hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <Badge variant="secondary">{getSourceLabel(program.source)}</Badge>
            {program.category && (
              <Badge variant="outline">{program.category}</Badge>
            )}
            {match && match.relevanceScore >= 7 && (
              <span
                className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-bold ${getScoreColor(match.relevanceScore)}`}
              >
                <TrendingUp className="size-3" />
                {match.relevanceScore}/10
              </span>
            )}
          </div>

          <h3 className="mb-1 text-base font-semibold leading-snug">
            {program.title}
          </h3>

          {match?.aiSummary && (
            <p className="mb-3 rounded-lg bg-blue-50 p-3 text-sm leading-relaxed text-blue-800">
              {match.aiSummary}
            </p>
          )}

          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            {program.organization && (
              <span className="flex items-center gap-1">
                <Building2 className="size-3" />
                {program.organization}
              </span>
            )}
            {program.deadline && (
              <span className="flex items-center gap-1">
                <Calendar className="size-3" />
                마감: {program.deadline}
              </span>
            )}
            {program.supportAmount && (
              <span className="flex items-center gap-1">
                <Zap className="size-3" />
                {program.supportAmount.slice(0, 50)}
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onBookmark(program.id, !isBookmarked)}
            title={isBookmarked ? "찜 해제" : "찜하기"}
          >
            {isBookmarked ? (
              <BookmarkCheck className="size-4 text-amber-500" />
            ) : (
              <Bookmark className="size-4" />
            )}
          </Button>
          {program.applyUrl && (
            <a href={program.applyUrl} target="_blank" rel="noopener noreferrer">
              <Button variant="ghost" size="icon" title="원문 보기">
                <ExternalLink className="size-4" />
              </Button>
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [programs, setPrograms] = useState<ProgramWithMatch[]>([]);
  const [filter, setFilter] = useState<FilterType>("matched");
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchPrograms = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/programs?filter=${filter}&page=${page}`);
      const data = await res.json();
      setPrograms(data.programs || []);
      setTotalPages(data.totalPages || 1);
      setTotal(data.total || 0);
    } catch (error) {
      console.error("Fetch failed:", error);
    } finally {
      setLoading(false);
    }
  }, [filter, page]);

  useEffect(() => {
    fetchPrograms();
  }, [fetchPrograms]);

  const runPipeline = async () => {
    setRunning(true);
    try {
      const res = await fetch("/api/cron", { method: "POST" });
      const data = await res.json();
      alert(
        `수집: ${data.collected?.newCount || 0}건 / 매칭: ${data.matched || 0}건 / 알림: ${data.notified?.sent || 0}건`
      );
      fetchPrograms();
    } catch (error) {
      console.error("Pipeline failed:", error);
      alert("파이프라인 실행 실패");
    } finally {
      setRunning(false);
    }
  };

  const handleBookmark = async (programId: number, bookmarked: boolean) => {
    try {
      await fetch(`/api/programs/${programId}/bookmark`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookmarked }),
      });
      setPrograms((prev) =>
        prev.map((item) =>
          item.program.id === programId
            ? {
                ...item,
                match: item.match ? { ...item.match, bookmarked } : null,
              }
            : item
        )
      );
    } catch (error) {
      console.error("Bookmark failed:", error);
    }
  };

  const filtered = searchQuery
    ? programs.filter(
        (item) =>
          item.program.title
            .toLowerCase()
            .includes(searchQuery.toLowerCase()) ||
          item.match?.aiSummary
            ?.toLowerCase()
            .includes(searchQuery.toLowerCase())
      )
    : programs;

  const filters: { key: FilterType; label: string }[] = [
    { key: "matched", label: "AI 매칭" },
    { key: "all", label: "전체 공고" },
    { key: "bookmarked", label: "찜한 공고" },
  ];

  return (
    <div className="mx-auto min-h-screen max-w-3xl px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">
          정부지원사업 알림
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          블로그치트키 성장을 위한 정부지원사업 자동 매칭
        </p>
      </div>

      {/* Actions */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <Button onClick={runPipeline} disabled={running} className="gap-2">
          {running ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <RefreshCw className="size-4" />
          )}
          {running ? "실행 중..." : "수집 + 매칭 + 알림"}
        </Button>

        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-9 w-full rounded-lg border border-input bg-background pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="mb-4 flex gap-1 rounded-lg bg-muted p-1">
        {filters.map((f) => (
          <button
            key={f.key}
            onClick={() => {
              setFilter(f.key);
              setPage(1);
            }}
            className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              filter === f.key
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Stats */}
      <div className="mb-4 text-xs text-muted-foreground">
        총 {total}건 중 {filtered.length}건 표시
      </div>

      {/* Program List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-20 text-center text-muted-foreground">
          <Filter className="mx-auto mb-3 size-10 opacity-30" />
          <p className="text-sm">
            {filter === "bookmarked"
              ? "찜한 공고가 없습니다"
              : "표시할 공고가 없습니다"}
          </p>
          <p className="mt-1 text-xs">
            위의 &quot;수집 + 매칭 + 알림&quot; 버튼으로 데이터를 수집해보세요
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((item) => (
            <ProgramCard
              key={item.program.id}
              item={item}
              onBookmark={handleBookmark}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            이전
          </Button>
          <span className="text-sm text-muted-foreground">
            {page} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            다음
          </Button>
        </div>
      )}
    </div>
  );
}
