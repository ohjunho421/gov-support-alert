import axios from "axios";
import * as cheerio from "cheerio";
import type { NewGovProgram } from "../db/schema";

interface CrawlTarget {
  name: string;
  url: string;
  parse: (html: string) => NewGovProgram[];
}

/**
 * K-Startup 사이트 파서
 * 구조: ul > li.notice > div.inner > div.right > div.top/middle/bottom
 */
function parseKStartup(html: string): NewGovProgram[] {
  const $ = cheerio.load(html);
  const programs: NewGovProgram[] = [];

  $("li.notice").each((_, el) => {
    const $el = $(el);
    const inner = $el.find(".inner");
    const right = inner.find(".right");

    const category = right.find(".top .flag.type07, .top .flag:not(.day)").first().text().trim();
    const dday = right.find(".top .flag.day").text().trim();
    const title = right.find(".middle a").first().text().replace(/새로운게시글/g, "").trim();

    const bottomSpans = right.find(".bottom span.list");
    const org = bottomSpans.eq(1).text().trim();

    let deadline: string | null = null;
    bottomSpans.each((_, span) => {
      const text = $(span).text().trim();
      if (text.startsWith("마감일자")) {
        deadline = text.replace("마감일자", "").trim();
      }
    });

    const onclick = inner.find("[onclick*=go_view]").attr("onclick") || "";
    const pbancSn = onclick.match(/go_view(?:_blank)?\((\d+)\)/);
    const detailUrl = pbancSn
      ? `https://www.k-startup.go.kr/web/contents/bizpbanc-ongoing.do?schM=view&pbancSn=${pbancSn[1]}`
      : "";

    if (title) {
      programs.push({
        title,
        description: dday ? `[${dday}] ${category || ""}` : null,
        organization: org || "K-Startup",
        supportAmount: null,
        deadline,
        applyUrl: detailUrl || null,
        sourceUrl: detailUrl || null,
        source: "k-startup",
        category: category || "창업지원",
        region: null,
        rawData: { title, org, category, deadline, dday, pbancSn: pbancSn?.[1] },
      });
    }
  });

  return programs;
}

const CRAWL_TARGETS: CrawlTarget[] = [
  {
    name: "K-Startup",
    url: "https://www.k-startup.go.kr/web/contents/bizpbanc-ongoing.do",
    parse: parseKStartup,
  },
];

export async function collectFromCrawling(): Promise<NewGovProgram[]> {
  const allPrograms: NewGovProgram[] = [];

  for (const target of CRAWL_TARGETS) {
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const response = await axios.get(target.url, {
          timeout: 20000,
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8",
            Accept:
              "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          },
        });
        const programs = target.parse(response.data);
        allPrograms.push(...programs);
        console.log(`[Crawler] ${target.name}: ${programs.length} items`);
        break;
      } catch (error) {
        console.warn(
          `[Crawler] ${target.name} attempt ${attempt}/3 failed:`,
          (error as Error).message
        );
        if (attempt < 3) {
          await new Promise((r) => setTimeout(r, 2000 * attempt));
        }
      }
    }
  }

  return allPrograms;
}
