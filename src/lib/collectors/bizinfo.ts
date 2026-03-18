import axios from "axios";
import type { NewGovProgram } from "../db/schema";

const BIZINFO_API_URL =
  "https://www.bizinfo.go.kr/uss/rss/bizinfoApi.do";
const BIZINFO_BASE_URL = "https://www.bizinfo.go.kr";
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 2000;

interface BizInfoItem {
  pblancNm: string;
  jrsdInsttNm: string;
  reqstBeginEndDe: string;
  pblancUrl: string;
  bsnsSumryCn: string;
  sprtCn: string;
  pldirSportRealmLclasCodeNm: string;
  areaNm: string;
  trgetNm: string;
  hashTags: string;
  excInsttNm: string;
}

function toFullUrl(path: string): string {
  if (!path) return "";
  if (path.startsWith("http")) return path;
  return `${BIZINFO_BASE_URL}${path}`;
}

export async function collectFromBizinfo(): Promise<NewGovProgram[]> {
  const apiKey = process.env.BIZINFO_API_KEY;
  if (!apiKey) {
    console.warn("[BizInfo] API key not set, skipping");
    return [];
  }

  try {
    let response = null;
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        response = await axios.get(BIZINFO_API_URL, {
          params: {
            crtfcKey: apiKey,
            dataType: "json",
            pageUnit: "100",
            pageIndex: "1",
          },
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            Accept: "application/json, text/plain, */*",
            "Accept-Language": "ko-KR,ko;q=0.9",
          },
          timeout: 30000,
        });
        break;
      } catch (err) {
        console.warn(
          `[BizInfo] Attempt ${attempt}/${MAX_RETRIES} failed:`,
          (err as Error).message
        );
        if (attempt === MAX_RETRIES) throw err;
        await new Promise((r) => setTimeout(r, RETRY_DELAY_MS * attempt));
      }
    }

    const items: BizInfoItem[] = response?.data?.jsonArray || [];

    console.log(`[BizInfo] Fetched ${items.length} items`);

    return items.map((item) => {
      const deadlineStr = item.reqstBeginEndDe?.split("~")[1]?.trim();
      const fullUrl = toFullUrl(item.pblancUrl);

      return {
        title: item.pblancNm,
        description: [
          item.bsnsSumryCn,
          item.trgetNm ? `[대상] ${item.trgetNm}` : "",
          item.hashTags ? `[태그] ${item.hashTags}` : "",
        ]
          .filter(Boolean)
          .join("\n"),
        organization: item.jrsdInsttNm || item.excInsttNm || "",
        supportAmount: item.sprtCn || null,
        deadline: deadlineStr || null,
        applyUrl: fullUrl || null,
        sourceUrl: fullUrl || null,
        source: "bizinfo",
        category: item.pldirSportRealmLclasCodeNm || null,
        region: item.areaNm || null,
        rawData: item,
      };
    });
  } catch (error) {
    console.error("[BizInfo] Collection failed:", (error as Error).message);
    return [];
  }
}
