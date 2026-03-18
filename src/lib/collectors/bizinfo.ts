import axios from "axios";
import type { NewGovProgram } from "../db/schema";

const BIZINFO_API_URL =
  "https://www.bizinfo.go.kr/uss/rss/bizinfoApi.do";
const BIZINFO_BASE_URL = "https://www.bizinfo.go.kr";

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
    const params = new URLSearchParams({
      crtfcKey: apiKey,
      dataType: "json",
      pageUnit: "100",
      pageIndex: "1",
    });

    const response = await axios.post(BIZINFO_API_URL, params.toString(), {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      timeout: 30000,
    });

    const items: BizInfoItem[] = response.data?.jsonArray || [];

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
    console.error("[BizInfo] Collection failed:", error);
    return [];
  }
}
