import axios from "axios";
import * as cheerio from "cheerio";
import type { NewGovProgram } from "../db/schema";

interface CrawlTarget {
  name: string;
  url: string;
  parse: (html: string) => NewGovProgram[];
}

function parseKStartup(html: string): NewGovProgram[] {
  const $ = cheerio.load(html);
  const programs: NewGovProgram[] = [];

  $(".tbl_wrap tbody tr, .board_list tbody tr, .list_wrap li").each(
    (_, el) => {
      const $el = $(el);
      const title =
        $el.find("td:nth-child(2) a, .tit, .subject a").text().trim();
      const org = $el.find("td:nth-child(3), .org").text().trim();
      const deadline = $el.find("td:nth-child(4), .date").text().trim();
      const link = $el.find("a").attr("href") || "";

      if (title) {
        programs.push({
          title,
          description: null,
          organization: org || "K-Startup",
          supportAmount: null,
          deadline: deadline || null,
          applyUrl: link.startsWith("http")
            ? link
            : `https://www.k-startup.go.kr${link}`,
          sourceUrl: link.startsWith("http")
            ? link
            : `https://www.k-startup.go.kr${link}`,
          source: "k-startup",
          category: "창업지원",
          region: null,
          rawData: { title, org, deadline, link },
        });
      }
    }
  );

  return programs;
}

function parseKised(html: string): NewGovProgram[] {
  const $ = cheerio.load(html);
  const programs: NewGovProgram[] = [];

  $(".board_list tbody tr, .bbs_list tbody tr").each((_, el) => {
    const $el = $(el);
    const title = $el.find("td.subject a, td:nth-child(2) a").text().trim();
    const date = $el.find("td:nth-child(4), td.date").text().trim();
    const link = $el.find("a").attr("href") || "";

    if (title) {
      programs.push({
        title,
        description: null,
        organization: "창업진흥원",
        supportAmount: null,
        deadline: date || null,
        applyUrl: link.startsWith("http")
          ? link
          : `https://www.kised.or.kr${link}`,
        sourceUrl: link.startsWith("http")
          ? link
          : `https://www.kised.or.kr${link}`,
        source: "kised",
        category: "창업지원",
        region: null,
        rawData: { title, date, link },
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
  {
    name: "창업진흥원",
    url: "https://www.kised.or.kr/menu.es?mid=a10305010000",
    parse: parseKised,
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
